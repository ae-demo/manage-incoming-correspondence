// Correspondence intake, routing, handling and closure — the core of this
// service. Movement history is append-only: every routing, reassignment,
// status change, response and close writes one row and nothing updates one.

import ballerina/http;
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;
import ballerinax/postgresql;

type CorrespondenceRow record {|
    string id;
    string 'source;
    string? senderName;
    string? category;
    string status;
    string? departmentId;
    string receivedDate;
    string? dueDate;
    string? scannedDocumentUrl;
|};

type MovementRow record {|
    string id;
    string correspondenceId;
    string? fromDepartmentId;
    string? toDepartmentId;
    string action;
    string actorUserId;
    string occurredAt;
|};

function toCorrespondence(CorrespondenceRow row) returns Correspondence {
    boolean overdue = row.status != "closed" && row.dueDate is string && isBeforeToday(<string>row.dueDate);
    return {
        id: row.id,
        'source: row.'source == "email" ? "email" : "physical",
        senderName: row.senderName ?: "",
        category: row.category ?: "",
        status: <"new"|"routed"|"in-progress"|"responded"|"closed">row.status,
        departmentId: row.departmentId,
        receivedDate: row.receivedDate,
        dueDate: row.dueDate,
        overdue,
        scannedDocumentUrl: row.scannedDocumentUrl
    };
}

function toMovement(MovementRow row) returns Movement => {
    id: row.id,
    correspondenceId: row.correspondenceId,
    fromDepartmentId: row.fromDepartmentId,
    toDepartmentId: row.toDepartmentId,
    action: row.action,
    actorUserId: row.actorUserId,
    occurredAt: row.occurredAt
};

function insertMovement(postgresql:Client db, string correspondenceId, string? fromDepartmentId,
        string? toDepartmentId, string action, string actorUserId) returns error? {
    string id = uuid:createRandomUuid();
    _ = check db->execute(`
        INSERT INTO movements (id, correspondence_id, from_department_id, to_department_id, action, actor_user_id, occurred_at)
        VALUES (${id}, ${correspondenceId}, ${fromDepartmentId}, ${toDepartmentId}, ${action}, ${actorUserId}, ${new sql:TimestampValue(time:utcNow())})`);
}

function findCorrespondenceById(postgresql:Client db, string correspondenceId) returns CorrespondenceRow? {
    CorrespondenceRow|sql:Error row = db->queryRow(`
        SELECT id, source, sender_name AS senderName, category, status, department_id AS departmentId,
               received_date AS receivedDate, due_date AS dueDate, scanned_document_url AS scannedDocumentUrl
        FROM correspondence WHERE id = ${correspondenceId}`);
    if row is CorrespondenceRow {
        return row;
    }
    return ();
}

function buildCorrespondenceQuery(string? sender, string? departmentId, string? status, boolean? overdue,
        string? restrictDepartmentId, int 'limit, int offset) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery query = `
        SELECT id, source, sender_name AS senderName, category, status, department_id AS departmentId,
               received_date AS receivedDate, due_date AS dueDate, scanned_document_url AS scannedDocumentUrl
        FROM correspondence WHERE 1 = 1`;
    if restrictDepartmentId is string {
        query = sql:queryConcat(query, ` AND department_id = ${restrictDepartmentId}`);
    }
    if sender is string {
        query = sql:queryConcat(query, ` AND sender_name ILIKE ${"%" + sender + "%"}`);
    }
    if departmentId is string {
        query = sql:queryConcat(query, ` AND department_id = ${departmentId}`);
    }
    if status is string {
        query = sql:queryConcat(query, ` AND status = ${status}`);
    }
    if overdue is boolean {
        if overdue {
            query = sql:queryConcat(query, ` AND status != 'closed' AND due_date IS NOT NULL AND due_date < CURRENT_DATE`);
        } else {
            query = sql:queryConcat(query, ` AND (status = 'closed' OR due_date IS NULL OR due_date >= CURRENT_DATE)`);
        }
    }
    query = sql:queryConcat(query, ` ORDER BY received_date DESC LIMIT ${'limit} OFFSET ${offset}`);
    return query;
}

function buildCorrespondenceCountQuery(string? sender, string? departmentId, string? status, boolean? overdue,
        string? restrictDepartmentId) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery query = `SELECT COUNT(*) FROM correspondence WHERE 1 = 1`;
    if restrictDepartmentId is string {
        query = sql:queryConcat(query, ` AND department_id = ${restrictDepartmentId}`);
    }
    if sender is string {
        query = sql:queryConcat(query, ` AND sender_name ILIKE ${"%" + sender + "%"}`);
    }
    if departmentId is string {
        query = sql:queryConcat(query, ` AND department_id = ${departmentId}`);
    }
    if status is string {
        query = sql:queryConcat(query, ` AND status = ${status}`);
    }
    if overdue is boolean {
        if overdue {
            query = sql:queryConcat(query, ` AND status != 'closed' AND due_date IS NOT NULL AND due_date < CURRENT_DATE`);
        } else {
            query = sql:queryConcat(query, ` AND (status = 'closed' OR due_date IS NULL OR due_date >= CURRENT_DATE)`);
        }
    }
    return query;
}

function runCorrespondenceQuery(postgresql:Client db, string? sender, string? departmentId, string? status,
        boolean? overdue, string? restrictDepartmentId, int 'limit, int offset) returns CorrespondencePage|error {
    int total = check db->queryRow(buildCorrespondenceCountQuery(sender, departmentId, status, overdue, restrictDepartmentId));
    stream<CorrespondenceRow, sql:Error?> rows = db->query(
        buildCorrespondenceQuery(sender, departmentId, status, overdue, restrictDepartmentId, 'limit, offset));
    Correspondence[] items = [];
    check rows.forEach(function(CorrespondenceRow row) {
        items.push(toCorrespondence(row));
    });
    return {count: total, data: items};
}

function listCorrespondence(string? sender, string? departmentId, string? status, boolean? overdue, int 'limit,
        int offset) returns CorrespondencePageOk|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    CorrespondencePage|error page = runCorrespondenceQuery(db, sender, departmentId, status, overdue, (), 'limit, offset);
    if page is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to list correspondence"}};
    }
    return <CorrespondencePageOk>{body: page};
}

function listMyDepartmentCorrespondence(string username, string? status, int 'limit, int offset)
        returns CorrespondencePageOk|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    OnboardingRow? onboarding = findOnboardingByUsername(db, username);
    if onboarding is () {
        return <CorrespondencePageOk>{body: {count: 0, data: []}};
    }
    CorrespondencePage|error page = runCorrespondenceQuery(db, (), (), status, (), onboarding.departmentId, 'limit, offset);
    if page is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to list correspondence"}};
    }
    return <CorrespondencePageOk>{body: page};
}

function getCorrespondence(string correspondenceId) returns CorrespondenceOk|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    CorrespondenceRow? row = findCorrespondenceById(db, correspondenceId);
    if row is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    return <CorrespondenceOk>{body: toCorrespondence(row)};
}

// A row that exists but is not the caller's own department is 404, never 403.
function getMyDepartmentCorrespondence(string username, string correspondenceId)
        returns CorrespondenceOk|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    OnboardingRow? onboarding = findOnboardingByUsername(db, username);
    if onboarding is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    CorrespondenceRow? row = findCorrespondenceById(db, correspondenceId);
    if row is () || row.departmentId != onboarding.departmentId {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    return <CorrespondenceOk>{body: toCorrespondence(row)};
}

function listCorrespondenceMovements(string correspondenceId) returns MovementPageOk|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    CorrespondenceRow? existing = findCorrespondenceById(db, correspondenceId);
    if existing is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    Movement[] items = loadMovements(db, correspondenceId);
    return <MovementPageOk>{body: {count: items.length(), data: items}};
}

function listMyDepartmentCorrespondenceMovements(string username, string correspondenceId)
        returns MovementPageOk|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    OnboardingRow? onboarding = findOnboardingByUsername(db, username);
    if onboarding is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    CorrespondenceRow? existing = findCorrespondenceById(db, correspondenceId);
    if existing is () || existing.departmentId != onboarding.departmentId {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    Movement[] items = loadMovements(db, correspondenceId);
    return <MovementPageOk>{body: {count: items.length(), data: items}};
}

function loadMovements(postgresql:Client db, string correspondenceId) returns Movement[] {
    stream<MovementRow, sql:Error?> rows = db->query(`
        SELECT id, correspondence_id AS correspondenceId, from_department_id AS fromDepartmentId,
               to_department_id AS toDepartmentId, action, actor_user_id AS actorUserId, occurred_at AS occurredAt
        FROM movements WHERE correspondence_id = ${correspondenceId} ORDER BY occurred_at ASC`);
    Movement[] items = [];
    error? iterResult = rows.forEach(function(MovementRow row) {
        items.push(toMovement(row));
    });
    if iterResult is error {
        return [];
    }
    return items;
}

function logCorrespondence(CorrespondenceCreate payload, string actorUserId)
        returns CorrespondenceCreated|ErrorBadRequest|ErrorInternal {
    if payload.senderName.trim() == "" || payload.category.trim() == "" || payload.scannedDocumentUrl.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "senderName, category and scannedDocumentUrl are required"}};
    }
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    string id = uuid:createRandomUuid();
    string receivedDate = todayDate();
    sql:ExecutionResult|sql:Error inserted = db->execute(`
        INSERT INTO correspondence (id, source, sender_name, category, status, department_id, received_date, due_date, scanned_document_url)
        VALUES (${id}, 'physical', ${payload.senderName}, ${payload.category}, 'new', NULL, ${new sql:DateValue(receivedDate)}, NULL, ${payload.scannedDocumentUrl})`);
    if inserted is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to log correspondence"}};
    }
    error? movementResult = insertMovement(db, id, (), (), "logged", actorUserId);
    if movementResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to record movement"}};
    }
    return <CorrespondenceCreated>{body: {id, 'source: "physical", senderName: payload.senderName, category: payload.category, status: "new", departmentId: (), receivedDate, dueDate: (), overdue: false, scannedDocumentUrl: payload.scannedDocumentUrl}};
}

function routeCorrespondence(string correspondenceId, RouteRequest payload, string actorUserId)
        returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    CorrespondenceRow? existing = findCorrespondenceById(db, correspondenceId);
    if existing is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    if existing.status != "new" {
        return <ErrorBadRequest>{body: {code: 400, message: "only a newly logged item may be routed"}};
    }
    DepartmentRow? department = findActiveDepartment(db, payload.departmentId);
    if department is () {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid or deactivated department"}};
    }
    string dueDate = addDaysToDate(todayDate(), department.defaultTurnaroundDays);
    sql:ExecutionResult|sql:Error updated = db->execute(`
        UPDATE correspondence SET department_id = ${payload.departmentId}, status = 'routed', due_date = ${new sql:DateValue(dueDate)}
        WHERE id = ${correspondenceId}`);
    if updated is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to route correspondence"}};
    }
    error? movementResult = insertMovement(db, correspondenceId, (), payload.departmentId, "routed", actorUserId);
    if movementResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to record movement"}};
    }
    notifyAssignment(db, payload.departmentId, correspondenceId);
    return <CorrespondenceOk>{body: {id: correspondenceId, 'source: existing.'source == "email" ? "email" : "physical", senderName: existing.senderName ?: "", category: existing.category ?: "", status: "routed", departmentId: payload.departmentId, receivedDate: existing.receivedDate, dueDate, overdue: false, scannedDocumentUrl: existing.scannedDocumentUrl}};
}

function reassignCorrespondence(string correspondenceId, ReassignRequest payload, string actorUserId)
        returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    CorrespondenceRow? existing = findCorrespondenceById(db, correspondenceId);
    if existing is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    if existing.status == "closed" {
        return <ErrorBadRequest>{body: {code: 400, message: "a closed item may not be reassigned"}};
    }
    DepartmentRow? department = findActiveDepartment(db, payload.departmentId);
    if department is () {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid or deactivated department"}};
    }
    string dueDate = addDaysToDate(todayDate(), department.defaultTurnaroundDays);
    sql:ExecutionResult|sql:Error updated = db->execute(`
        UPDATE correspondence SET department_id = ${payload.departmentId}, status = 'routed', due_date = ${new sql:DateValue(dueDate)}
        WHERE id = ${correspondenceId}`);
    if updated is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to reassign correspondence"}};
    }
    string? fromDepartmentId = existing.departmentId;
    error? movementResult = insertMovement(db, correspondenceId, fromDepartmentId, payload.departmentId, "reassigned", actorUserId);
    if movementResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to record movement"}};
    }
    notifyAssignment(db, payload.departmentId, correspondenceId);
    return <CorrespondenceOk>{body: {id: correspondenceId, 'source: existing.'source == "email" ? "email" : "physical", senderName: existing.senderName ?: "", category: existing.category ?: "", status: "routed", departmentId: payload.departmentId, receivedDate: existing.receivedDate, dueDate, overdue: false, scannedDocumentUrl: existing.scannedDocumentUrl}};
}

final string[] & readonly VALID_STATUSES = ["new", "routed", "in-progress", "responded", "closed"];

function updateMyDepartmentCorrespondenceStatus(string username, string correspondenceId, StatusUpdateRequest payload)
        returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal {
    if VALID_STATUSES.indexOf(payload.status) is () {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid status", description: "must be one of new, routed, in-progress, responded, closed"}};
    }
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    OnboardingRow? onboarding = findOnboardingByUsername(db, username);
    if onboarding is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    CorrespondenceRow? existing = findCorrespondenceById(db, correspondenceId);
    if existing is () || existing.departmentId != onboarding.departmentId {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    sql:ExecutionResult|sql:Error updated = db->execute(`UPDATE correspondence SET status = ${payload.status} WHERE id = ${correspondenceId}`);
    if updated is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to update status"}};
    }
    error? movementResult = insertMovement(db, correspondenceId, (), (), "status:" + payload.status, onboarding.userId);
    if movementResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to record movement"}};
    }
    CorrespondenceRow updatedRow = existing;
    updatedRow.status = payload.status;
    return <CorrespondenceOk>{body: toCorrespondence(updatedRow)};
}

function recordMyDepartmentCorrespondenceResponse(string username, string correspondenceId, ResponseCreateRequest payload)
        returns ResponseCreated|ErrorBadRequest|ErrorNotFound|ErrorInternal {
    string? note = payload.note;
    string? attachmentUrl = payload.attachmentUrl;
    if (note is () || note.trim() == "") && (attachmentUrl is () || attachmentUrl.trim() == "") {
        return <ErrorBadRequest>{body: {code: 400, message: "note or attachmentUrl is required"}};
    }
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    OnboardingRow? onboarding = findOnboardingByUsername(db, username);
    if onboarding is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    CorrespondenceRow? existing = findCorrespondenceById(db, correspondenceId);
    if existing is () || existing.departmentId != onboarding.departmentId {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    string id = uuid:createRandomUuid();
    time:Utc recordedAtUtc = time:utcNow();
    sql:ExecutionResult|sql:Error inserted = db->execute(`
        INSERT INTO responses (id, correspondence_id, note, attachment_url, recorded_by_user_id, recorded_at)
        VALUES (${id}, ${correspondenceId}, ${note}, ${attachmentUrl}, ${onboarding.userId}, ${new sql:TimestampValue(recordedAtUtc)})`);
    if inserted is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to record response"}};
    }
    sql:ExecutionResult|sql:Error updated = db->execute(`UPDATE correspondence SET status = 'responded' WHERE id = ${correspondenceId}`);
    if updated is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to update status"}};
    }
    error? movementResult = insertMovement(db, correspondenceId, (), (), "responded", onboarding.userId);
    if movementResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to record movement"}};
    }
    return <ResponseCreated>{body: {correspondenceId, note, attachmentUrl, recordedAt: time:utcToString(recordedAtUtc)}};
}

function closeMyDepartmentCorrespondence(string username, string correspondenceId)
        returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    OnboardingRow? onboarding = findOnboardingByUsername(db, username);
    if onboarding is () {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    CorrespondenceRow? existing = findCorrespondenceById(db, correspondenceId);
    if existing is () || existing.departmentId != onboarding.departmentId {
        return <ErrorNotFound>{body: {code: 404, message: "correspondence not found"}};
    }
    int|sql:Error responseCount = db->queryRow(`SELECT COUNT(*) FROM responses WHERE correspondence_id = ${correspondenceId}`);
    int count = responseCount is int ? responseCount : 0;
    if count == 0 {
        return <ErrorBadRequest>{body: {code: 400, message: "no response recorded yet", description: "closing requires a recorded response"}};
    }
    sql:ExecutionResult|sql:Error updated = db->execute(`UPDATE correspondence SET status = 'closed' WHERE id = ${correspondenceId}`);
    if updated is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to close correspondence"}};
    }
    error? movementResult = insertMovement(db, correspondenceId, (), (), "closed", onboarding.userId);
    if movementResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to record movement"}};
    }
    CorrespondenceRow updatedRow = existing;
    updatedRow.status = "closed";
    return <CorrespondenceOk>{body: toCorrespondence(updatedRow)};
}

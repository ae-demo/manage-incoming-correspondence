// Department directory: list, create, update, deactivate, and the lookups
// other modules need (turnaround days, active-only routing targets).

import ballerina/http;
import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

type DepartmentRow record {|
    string id;
    string name;
    string status;
    string? mailboxConfig;
    int defaultTurnaroundDays;
|};

function toDepartment(DepartmentRow row) returns Department => {
    id: row.id,
    name: row.name,
    status: row.status == "deactivated" ? "deactivated" : "active",
    mailboxConfig: row.mailboxConfig,
    defaultTurnaroundDays: row.defaultTurnaroundDays
};

function listDepartments(int 'limit, int offset) returns DepartmentPageOk|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    int|error countResult = db->queryRow(`SELECT COUNT(*) FROM departments`);
    int total = countResult is int ? countResult : 0;
    stream<DepartmentRow, sql:Error?> rows = db->query(`
        SELECT id, name, status, mailbox_config AS mailboxConfig, default_turnaround_days AS defaultTurnaroundDays
        FROM departments ORDER BY name LIMIT ${'limit} OFFSET ${offset}`);
    Department[] departments = [];
    error? iterResult = rows.forEach(function(DepartmentRow row) {
        departments.push(toDepartment(row));
    });
    if iterResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to list departments"}};
    }
    return <DepartmentPageOk>{body: {count: total, data: departments}};
}

function createDepartment(DepartmentCreateRequest payload) returns DepartmentCreated|ErrorBadRequest|ErrorInternal {
    if payload.name.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "name is required"}};
    }
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    string id = uuid:createRandomUuid();
    int turnaround = payload.defaultTurnaroundDays ?: 5;
    sql:ExecutionResult|sql:Error inserted = db->execute(`
        INSERT INTO departments (id, name, status, mailbox_config, default_turnaround_days)
        VALUES (${id}, ${payload.name}, 'active', NULL, ${turnaround})`);
    if inserted is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to create department"}};
    }
    return <DepartmentCreated>{body: {id, name: payload.name, status: "active", mailboxConfig: (), defaultTurnaroundDays: turnaround}};
}

function updateDepartment(string departmentId, DepartmentUpdateRequest payload) returns DepartmentOk|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    DepartmentRow|sql:Error existing = db->queryRow(`
        SELECT id, name, status, mailbox_config AS mailboxConfig, default_turnaround_days AS defaultTurnaroundDays
        FROM departments WHERE id = ${departmentId}`);
    if existing is sql:NoRowsError {
        return <ErrorNotFound>{body: {code: 404, message: "department not found"}};
    }
    if existing is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to load department"}};
    }
    string newName = payload.name ?: existing.name;
    string? newMailbox = payload.mailboxConfig ?: existing.mailboxConfig;
    int newTurnaround = payload.defaultTurnaroundDays ?: existing.defaultTurnaroundDays;
    sql:ExecutionResult|sql:Error updated = db->execute(`
        UPDATE departments SET name = ${newName}, mailbox_config = ${newMailbox}, default_turnaround_days = ${newTurnaround}
        WHERE id = ${departmentId}`);
    if updated is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to update department"}};
    }
    return <DepartmentOk>{body: {id: departmentId, name: newName, status: existing.status == "deactivated" ? "deactivated" : "active", mailboxConfig: newMailbox, defaultTurnaroundDays: newTurnaround}};
}

function deactivateDepartment(string departmentId) returns DepartmentOk|ErrorNotFound|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    DepartmentRow|sql:Error existing = db->queryRow(`
        SELECT id, name, status, mailbox_config AS mailboxConfig, default_turnaround_days AS defaultTurnaroundDays
        FROM departments WHERE id = ${departmentId}`);
    if existing is sql:NoRowsError {
        return <ErrorNotFound>{body: {code: 404, message: "department not found"}};
    }
    if existing is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to load department"}};
    }
    sql:ExecutionResult|sql:Error updated = db->execute(`UPDATE departments SET status = 'deactivated' WHERE id = ${departmentId}`);
    if updated is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to deactivate department"}};
    }
    return <DepartmentOk>{body: {id: departmentId, name: existing.name, status: "deactivated", mailboxConfig: existing.mailboxConfig, defaultTurnaroundDays: existing.defaultTurnaroundDays}};
}

// Only an ACTIVE department may be a routing/reassignment target; a
// deactivated one stays on its historical items unchanged but drops out here.
function findActiveDepartment(postgresql:Client db, string departmentId) returns DepartmentRow? {
    DepartmentRow|sql:Error row = db->queryRow(`
        SELECT id, name, status, mailbox_config AS mailboxConfig, default_turnaround_days AS defaultTurnaroundDays
        FROM departments WHERE id = ${departmentId} AND status = 'active'`);
    if row is DepartmentRow {
        return row;
    }
    return ();
}

function findDepartmentById(postgresql:Client db, string departmentId) returns DepartmentRow? {
    DepartmentRow|sql:Error row = db->queryRow(`
        SELECT id, name, status, mailbox_config AS mailboxConfig, default_turnaround_days AS defaultTurnaroundDays
        FROM departments WHERE id = ${departmentId}`);
    if row is DepartmentRow {
        return row;
    }
    return ();
}

// User onboarding: which department and role a signed-in identity holds.
//
// The onboarding row's userId is the caller's Thunder LOGIN NAME (the
// assertion's `username`), not the opaque `sub` — an Admin onboards a person
// by typing the name they sign in with, and security.json's testUsers are
// named the same way ("test-department-officer"). Every `/me/department/...`
// lookup below resolves through `requireCallerUsername`, never a header.

import ballerina/http;
import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

type OnboardingRow record {|
    string id;
    string userId;
    string departmentId;
    string role;
|};

function toUserOnboarding(OnboardingRow row) returns UserOnboarding => {
    id: row.id,
    userId: row.userId,
    departmentId: row.departmentId,
    role: <"RegistryOfficer"|"DepartmentOfficer"|"Supervisor">row.role
};

function listOnboardedUsers(int 'limit, int offset) returns UserOnboardingPageOk|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    int|error countResult = db->queryRow(`SELECT COUNT(*) FROM user_onboarding`);
    int total = countResult is int ? countResult : 0;
    stream<OnboardingRow, sql:Error?> rows = db->query(`
        SELECT id, user_id AS userId, department_id AS departmentId, role
        FROM user_onboarding ORDER BY user_id LIMIT ${'limit} OFFSET ${offset}`);
    UserOnboarding[] onboardings = [];
    error? iterResult = rows.forEach(function(OnboardingRow row) {
        onboardings.push(toUserOnboarding(row));
    });
    if iterResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to list onboarded users"}};
    }
    return <UserOnboardingPageOk>{body: {count: total, data: onboardings}};
}

function onboardUser(UserOnboardRequest payload) returns UserOnboardingCreated|ErrorBadRequest|ErrorInternal {
    if payload.userId.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "userId is required"}};
    }
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        return <ErrorInternal>{body: {code: 500, message: "database unavailable"}};
    }
    DepartmentRow? department = findDepartmentById(db, payload.departmentId);
    if department is () {
        return <ErrorBadRequest>{body: {code: 400, message: "invalid departmentId"}};
    }
    OnboardingRow|sql:Error existing = db->queryRow(`
        SELECT id, user_id AS userId, department_id AS departmentId, role FROM user_onboarding WHERE user_id = ${payload.userId}`);
    string id = existing is OnboardingRow ? existing.id : uuid:createRandomUuid();
    sql:ExecutionResult|sql:Error upserted = db->execute(`
        INSERT INTO user_onboarding (id, user_id, department_id, role)
        VALUES (${id}, ${payload.userId}, ${payload.departmentId}, ${payload.role})
        ON CONFLICT (user_id) DO UPDATE SET department_id = ${payload.departmentId}, role = ${payload.role}`);
    if upserted is sql:Error {
        return <ErrorInternal>{body: {code: 500, message: "failed to onboard user"}};
    }
    return <UserOnboardingCreated>{body: {id, userId: payload.userId, departmentId: payload.departmentId, role: payload.role}};
}

// The caller's own onboarding row, resolved by login name — () when the
// caller has never been onboarded into a department.
function findOnboardingByUsername(postgresql:Client db, string username) returns OnboardingRow? {
    OnboardingRow|sql:Error row = db->queryRow(`
        SELECT id, user_id AS userId, department_id AS departmentId, role
        FROM user_onboarding WHERE user_id = ${username}`);
    if row is OnboardingRow {
        return row;
    }
    return ();
}

// Every DepartmentOfficer onboarded into a department — the recipients of an
// assignment notification.
function findDepartmentOfficers(postgresql:Client db, string departmentId) returns OnboardingRow[] {
    stream<OnboardingRow, sql:Error?> rows = db->query(`
        SELECT id, user_id AS userId, department_id AS departmentId, role
        FROM user_onboarding WHERE department_id = ${departmentId} AND role = 'DepartmentOfficer'`);
    OnboardingRow[] officers = [];
    error? iterResult = rows.forEach(function(OnboardingRow row) {
        officers.push(row);
    });
    if iterResult is error {
        return [];
    }
    return officers;
}

// Every Supervisor in the org — overdue alerts go to all of them, since a
// Supervisor's role oversees correspondence across every department.
function findSupervisors(postgresql:Client db) returns OnboardingRow[] {
    stream<OnboardingRow, sql:Error?> rows = db->query(`
        SELECT id, user_id AS userId, department_id AS departmentId, role
        FROM user_onboarding WHERE role = 'Supervisor'`);
    OnboardingRow[] supervisors = [];
    error? iterResult = rows.forEach(function(OnboardingRow row) {
        supervisors.push(row);
    });
    if iterResult is error {
        return [];
    }
    return supervisors;
}

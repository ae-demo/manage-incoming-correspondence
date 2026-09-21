// Public, no-auth SLA performance aggregate. Never exposes a correspondence
// id, sender name or status — only per-department averages over the trailing
// 3-month window of CLOSED items, with an item still open past that window
// counting as the department's worst case ("3+ months").

import ballerina/http;
import ballerina/sql;
import ballerinax/postgresql;

type ClosedItemRow record {|
    string departmentId;
    string receivedDate;
    string closedDate;
|};

function listPublicDepartmentSlaPerformance() returns SlaPerformanceOk|ErrorInternal {
    postgresql:Client|http:InternalServerError db = requireDb();
    if db is http:InternalServerError {
        // A public endpoint answers empty data rather than a 500 when the
        // database is not yet wired — there is nothing to aggregate.
        return <SlaPerformanceOk>{body: {data: []}};
    }
    string windowStart = addDaysToDate(todayDate(), -90);

    map<string> departmentNames = {};
    stream<record {|string id; string name;|}, sql:Error?> departmentRows = db->query(`SELECT id, name FROM departments`);
    error? deptIterResult = departmentRows.forEach(function(record {|string id; string name;|} row) {
        departmentNames[row.id] = row.name;
    });
    if deptIterResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to load departments"}};
    }

    map<int[]> turnaroundsByDepartment = {};
    stream<ClosedItemRow, sql:Error?> closedRows = db->query(`
        SELECT c.department_id AS departmentId, c.received_date AS receivedDate, m.occurred_at::date AS closedDate
        FROM movements m JOIN correspondence c ON c.id = m.correspondence_id
        WHERE m.action = 'closed' AND m.occurred_at >= ${new sql:DateValue(windowStart)} AND c.department_id IS NOT NULL`);
    error? closedIterResult = closedRows.forEach(function(ClosedItemRow row) {
        int turnaround = daysBetween(row.receivedDate, row.closedDate);
        int[]? existing = turnaroundsByDepartment[row.departmentId];
        if existing is int[] {
            existing.push(turnaround);
        } else {
            turnaroundsByDepartment[row.departmentId] = [turnaround];
        }
    });
    if closedIterResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to aggregate closed items"}};
    }

    map<boolean> pastWindowOpenByDepartment = {};
    stream<record {|string departmentId;|}, sql:Error?> openRows = db->query(`
        SELECT DISTINCT department_id AS departmentId FROM correspondence
        WHERE status != 'closed' AND department_id IS NOT NULL AND received_date < ${new sql:DateValue(windowStart)}`);
    error? openIterResult = openRows.forEach(function(record {|string departmentId;|} row) {
        pastWindowOpenByDepartment[row.departmentId] = true;
    });
    if openIterResult is error {
        return <ErrorInternal>{body: {code: 500, message: "failed to aggregate open items"}};
    }

    DepartmentSlaPerformance[] results = [];
    foreach [string, int[]] [departmentId, turnarounds] in turnaroundsByDepartment.entries() {
        results.push(buildSlaEntry(departmentId, departmentNames[departmentId] ?: departmentId, turnarounds,
            pastWindowOpenByDepartment.hasKey(departmentId)));
    }
    foreach string departmentId in pastWindowOpenByDepartment.keys() {
        if !turnaroundsByDepartment.hasKey(departmentId) {
            results.push(buildSlaEntry(departmentId, departmentNames[departmentId] ?: departmentId, [], true));
        }
    }
    return <SlaPerformanceOk>{body: {data: results}};
}

function buildSlaEntry(string departmentId, string departmentName, int[] turnarounds, boolean pastWindowOpen)
        returns DepartmentSlaPerformance {
    if turnarounds.length() == 0 {
        return {
            departmentId,
            departmentName,
            averageDays: 0,
            bestDays: 0,
            worstLabel: pastWindowOpen ? "3+ months" : "0"
        };
    }
    int total = 0;
    int best = turnarounds[0];
    int worst = turnarounds[0];
    foreach int t in turnarounds {
        total += t;
        if t < best {
            best = t;
        }
        if t > worst {
            worst = t;
        }
    }
    decimal average = <decimal>total / <decimal>turnarounds.length();
    string worstLabel = pastWindowOpen ? "3+ months" : worst.toString();
    return {
        departmentId,
        departmentName,
        averageDays: average,
        bestDays: <decimal>best,
        worstLabel
    };
}

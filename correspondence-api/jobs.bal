// Periodic in-process background work — overdue detection and Gmail
// polling — as scheduled tasks inside this service, never a separate
// component. Both jobs are no-ops (log and skip) while their dependency is
// unconfigured, so a blank env var never crashes the process.

import ballerina/log;
import ballerina/sql;
import ballerina/task;
import ballerina/time;
import ballerinax/postgresql;

const decimal OVERDUE_CHECK_INTERVAL_SECONDS = 900; // 15 minutes
const decimal GMAIL_POLL_INTERVAL_SECONDS = 300; // 5 minutes

class OverdueCheckJob {
    *task:Job;
    public function execute() {
        checkOverdueCorrespondence();
    }
}

class GmailPollJob {
    *task:Job;
    public function execute() {
        pollAllMailboxes();
    }
}

function startBackgroundJobs() {
    task:JobId|task:Error overdueJob = task:scheduleJobRecurByFrequency(new OverdueCheckJob(), OVERDUE_CHECK_INTERVAL_SECONDS);
    if overdueJob is task:Error {
        log:printError("failed to schedule overdue-check job", overdueJob);
    }
    task:JobId|task:Error gmailJob = task:scheduleJobRecurByFrequency(new GmailPollJob(), GMAIL_POLL_INTERVAL_SECONDS);
    if gmailJob is task:Error {
        log:printError("failed to schedule Gmail-poll job", gmailJob);
    }
}

type OverdueRow record {|
    string id;
    string departmentId;
|};

// Flags every not-yet-closed item past its due date and notifies the
// Supervisors exactly once per item (a per-item `overdue_notified_at`
// timestamp guards against re-notifying on every tick).
function checkOverdueCorrespondence() {
    postgresql:Client? db = dbClient;
    if db is () {
        return;
    }
    stream<OverdueRow, sql:Error?> rows = db->query(`
        SELECT id, department_id AS departmentId FROM correspondence
        WHERE status != 'closed' AND due_date IS NOT NULL AND due_date < CURRENT_DATE AND overdue_notified_at IS NULL
          AND department_id IS NOT NULL`);
    OverdueRow[] overdueItems = [];
    error? iterResult = rows.forEach(function(OverdueRow row) {
        overdueItems.push(row);
    });
    if iterResult is error {
        log:printError("failed to scan for overdue correspondence", iterResult);
        return;
    }
    foreach OverdueRow item in overdueItems {
        notifyOverdue(db, item.id);
        sql:ExecutionResult|sql:Error updated = db->execute(
            `UPDATE correspondence SET overdue_notified_at = ${new sql:TimestampValue(time:utcNow())} WHERE id = ${item.id}`);
        if updated is sql:Error {
            log:printError("failed to mark correspondence as overdue-notified", updated, correspondenceId = item.id);
        }
    }
}

// Assignment and overdue notifications: email + SMS + an in-app Notification
// row. `Notification` has no REST endpoint (domain-model.md lists it as an
// audit entity only) — this module persists it purely for the service's own
// bookkeeping.
//
// CONTRACT GAP, noted rather than worked around: neither UserOnboarding nor
// any wired dependency carries an onboarded user's email address or phone
// number. There is no directory/profile lookup dependency in design.json for
// either. This module uses the onboarding row's `userId` (the caller's login
// name) as the email "to" address — the best available identifier — and
// always skips the SMS leg, logging why, since no phone number is reachable
// from anything this service is wired to.

import ballerina/log;
import ballerina/sql;
import ballerina/uuid;
import ballerina/time;
import ballerinax/postgresql;
import correspondence_api.emailservice;

final emailservice:Client? emailClient = initEmailClient();

function initEmailClient() returns emailservice:Client? {
    if emailServiceBaseUrl.trim() == "" {
        log:printWarn("EMAIL_SERVICE_BASE_URL is not set — assignment/overdue emails will be skipped");
        return ();
    }
    emailservice:Client|error c = new (serviceUrl = emailServiceBaseUrl);
    if c is error {
        log:printError("failed to create email-service client", c);
        return ();
    }
    return c;
}

// CONTRACT GAP: no directory dependency exists to resolve a phone number for
// a Thunder identity, so SMS notification is unreachable until one is wired.
function lookupPhoneNumber(string username) returns string? {
    return ();
}

function insertNotification(postgresql:Client db, string userId, string channel, string reason) {
    string id = uuid:createRandomUuid();
    sql:ExecutionResult|sql:Error result = db->execute(`
        INSERT INTO notifications (id, user_id, channel, reason, sent_at)
        VALUES (${id}, ${userId}, ${channel}, ${reason}, ${new sql:TimestampValue(time:utcNow())})`);
    if result is sql:Error {
        log:printError("failed to record notification", result, userId = userId, channel = channel);
    }
}

function dispatchNotification(postgresql:Client db, string userId, string reason, string subject, string body) {
    emailservice:Client? mailer = emailClient;
    if mailer is emailservice:Client {
        emailservice:EmailMessage|error sent = mailer->/emails.post({to: userId, subject, body});
        if sent is error {
            log:printError("failed to send notification email", sent, userId = userId, reason = reason);
        } else {
            insertNotification(db, userId, "email", reason);
        }
    }
    string? phone = lookupPhoneNumber(userId);
    if phone is string {
        sendSms(phone, body);
        insertNotification(db, userId, "sms", reason);
    } else {
        log:printInfo("skipping SMS notification: no phone number on file", userId = userId, reason = reason);
    }
    insertNotification(db, userId, "in-app", reason);
}

function notifyAssignment(postgresql:Client db, string departmentId, string correspondenceId) {
    OnboardingRow[] officers = findDepartmentOfficers(db, departmentId);
    foreach OnboardingRow officer in officers {
        dispatchNotification(db, officer.userId, "assignment",
            "New correspondence assigned",
            "Correspondence " + correspondenceId + " has been assigned to your department.");
    }
}

function notifyOverdue(postgresql:Client db, string correspondenceId) {
    OnboardingRow[] supervisors = findSupervisors(db);
    foreach OnboardingRow supervisor in supervisors {
        dispatchNotification(db, supervisor.userId, "overdue",
            "Correspondence overdue",
            "Correspondence " + correspondenceId + " is now past its due date.");
    }
}

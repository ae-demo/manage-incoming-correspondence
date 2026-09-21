// Database wiring for correspondence-db (postgres-cnpg). No env var here is
// required at startup: a blank host means dbClient stays () and every
// DB-backed handler answers a graceful 500 instead of the process crashing.

import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

final postgresql:Client? dbClient = initDbClient();

function initDbClient() returns postgresql:Client? {
    if dbHost.trim() == "" {
        log:printWarn("CORRESPONDENCE_DB_HOST is not set — this service will start, but every "
                + "database-backed operation will answer a 500 until the database is wired");
        return ();
    }
    int port = 5432;
    int|error parsedPort = int:fromString(dbPort);
    if parsedPort is int {
        port = parsedPort;
    }
    postgresql:Client|sql:Error connected = new (host = dbHost, username = dbUser, password = dbPassword,
        database = dbName, port = port);
    if connected is sql:Error {
        log:printError("failed to connect to correspondence-db", connected);
        return ();
    }
    return connected;
}

// The one place every handler asks for the database. Returns a ready-to-use
// client, or the 500 to return as-is when the database is not configured or
// unreachable — never a panic.
function requireDb() returns postgresql:Client|http:InternalServerError {
    postgresql:Client? c = dbClient;
    if c is () {
        return <http:InternalServerError>{
            body: {code: 500, message: "database unavailable", description: "correspondence-db is not configured"}
        };
    }
    return c;
}

function ensureSchema(postgresql:Client db) returns error? {
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS departments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            mailbox_config TEXT,
            default_turnaround_days INT NOT NULL DEFAULT 5
        )`);
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS user_onboarding (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            department_id TEXT NOT NULL REFERENCES departments(id),
            role TEXT NOT NULL
        )`);
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS correspondence (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            sender_name TEXT,
            category TEXT,
            status TEXT NOT NULL,
            department_id TEXT REFERENCES departments(id),
            received_date DATE NOT NULL,
            due_date DATE,
            scanned_document_url TEXT,
            gmail_message_id TEXT UNIQUE,
            overdue_notified_at TIMESTAMPTZ
        )`);
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS movements (
            id TEXT PRIMARY KEY,
            correspondence_id TEXT NOT NULL REFERENCES correspondence(id),
            from_department_id TEXT,
            to_department_id TEXT,
            action TEXT NOT NULL,
            actor_user_id TEXT NOT NULL,
            occurred_at TIMESTAMPTZ NOT NULL
        )`);
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS responses (
            id TEXT PRIMARY KEY,
            correspondence_id TEXT NOT NULL REFERENCES correspondence(id),
            note TEXT,
            attachment_url TEXT,
            recorded_by_user_id TEXT NOT NULL,
            recorded_at TIMESTAMPTZ NOT NULL
        )`);
    _ = check db->execute(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            channel TEXT NOT NULL,
            reason TEXT NOT NULL,
            sent_at TIMESTAMPTZ NOT NULL
        )`);
}

function init() returns error? {
    postgresql:Client? c = dbClient;
    if c is postgresql:Client {
        error? schemaResult = ensureSchema(c);
        if schemaResult is error {
            log:printError("failed to ensure correspondence-db schema", schemaResult);
        }
    }
    startBackgroundJobs();
}

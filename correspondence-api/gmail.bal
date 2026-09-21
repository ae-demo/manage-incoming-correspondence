// Email intake: polls each department's (or the organization default) Gmail
// mailbox via domain-wide-delegated service-account access and auto-logs new
// mail as correspondence with status "new". Every failure here is logged and
// skipped — a missing or bad service-account key must never crash the
// process, only leave intake unavailable.
//
// The `email-intake` contract only names client-credentials-shaped OAuth2 in
// its securityScheme, but domain-wide delegation is Google's JWT-bearer
// grant: this module mints its own signed assertion (RS256, `ballerina/jwt`
// + the service account's private key) and exchanges it at Google's token
// endpoint, then calls the two documented Gmail operations with that bearer
// token — no operation outside `listMessages` / `getMessage` is invoked.

import ballerina/crypto;
import ballerina/http;
import ballerina/jwt;
import ballerina/lang.value;
import ballerina/log;
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;
import ballerinax/postgresql;

type GoogleServiceAccountKey record {|
    string client_email;
    string private_key;
|};

type TokenResponse record {|
    string access_token;
    int expires_in?;
|};

type GmailMessageListItem record {|
    string id;
|};

type GmailMessageList record {|
    GmailMessageListItem[] messages = [];
|};

type GmailMessageHeader record {|
    string name;
    string value;
|};

type GmailMessage record {|
    string id;
    string? internalDate = ();
    record {|GmailMessageHeader[] headers = [];|}? payload = ();
|};

final http:Client gmailHttpClient = check new ("https://gmail.googleapis.com");
final http:Client googleTokenClient = check new ("https://oauth2.googleapis.com");

function parseServiceAccountKey() returns GoogleServiceAccountKey? {
    if gmailServiceAccountJson.trim() == "" {
        return ();
    }
    json|error parsed = value:fromJsonString(gmailServiceAccountJson);
    if parsed is error {
        log:printError("GMAIL_SERVICE_ACCOUNT_JSON is not valid JSON", parsed);
        return ();
    }
    GoogleServiceAccountKey|error key = parsed.cloneWithType();
    if key is error {
        log:printError("GMAIL_SERVICE_ACCOUNT_JSON is missing client_email/private_key", key);
        return ();
    }
    return key;
}

// Mints a domain-wide-delegated access token impersonating `mailboxAddress`.
function mintGmailAccessToken(string mailboxAddress) returns string|error {
    GoogleServiceAccountKey? serviceAccount = parseServiceAccountKey();
    if serviceAccount is () {
        return error("no Gmail service account configured");
    }
    crypto:PrivateKey|crypto:Error privateKey = crypto:decodeRsaPrivateKeyFromContent(serviceAccount.private_key.toBytes());
    if privateKey is crypto:Error {
        return error("Gmail service account private key is unreadable", privateKey);
    }
    jwt:IssuerConfig issuerConfig = {
        issuer: serviceAccount.client_email,
        username: mailboxAddress,
        audience: "https://oauth2.googleapis.com/token",
        expTime: 300,
        customClaims: {"scope": "https://www.googleapis.com/auth/gmail.readonly"},
        signatureConfig: {algorithm: jwt:RS256, config: privateKey}
    };
    string assertion = check jwt:issue(issuerConfig);
    http:Request tokenRequest = new;
    tokenRequest.setPayload(
        string `grant_type=${"urn:ietf:params:oauth:grant-type:jwt-bearer"}&assertion=${assertion}`,
        "application/x-www-form-urlencoded");
    TokenResponse tokenResponse = check googleTokenClient->post("/token", tokenRequest);
    return tokenResponse.access_token;
}

function listUnreadMessages(string mailboxAddress, string accessToken) returns GmailMessageListItem[]|error {
    map<string|string[]> headers = {"Authorization": "Bearer " + accessToken};
    GmailMessageList list = check gmailHttpClient->get(
        string `/gmail/v1/users/${mailboxAddress}/messages?q=is:unread`, headers);
    return list.messages;
}

function fetchMessage(string mailboxAddress, string messageId, string accessToken) returns GmailMessage|error {
    map<string|string[]> headers = {"Authorization": "Bearer " + accessToken};
    return gmailHttpClient->get(string `/gmail/v1/users/${mailboxAddress}/messages/${messageId}`, headers);
}

function headerValue(GmailMessage message, string name) returns string {
    record {|GmailMessageHeader[] headers = [];|}? payload = message.payload;
    if payload is () {
        return "";
    }
    foreach GmailMessageHeader header in payload.headers {
        if header.name.toLowerAscii() == name.toLowerAscii() {
            return header.value;
        }
    }
    return "";
}

function pollMailbox(postgresql:Client db, string mailboxAddress, string? departmentId) {
    string|error accessToken = mintGmailAccessToken(mailboxAddress);
    if accessToken is error {
        log:printWarn("skipping Gmail poll: could not obtain access token", mailboxAddress = mailboxAddress,
                reason = accessToken.message());
        return;
    }
    GmailMessageListItem[]|error messages = listUnreadMessages(mailboxAddress, accessToken);
    if messages is error {
        log:printError("failed to list Gmail messages", messages, mailboxAddress = mailboxAddress);
        return;
    }
    foreach GmailMessageListItem item in messages {
        if correspondenceExistsForGmailMessage(db, item.id) {
            continue;
        }
        GmailMessage|error fetched = fetchMessage(mailboxAddress, item.id, accessToken);
        if fetched is error {
            log:printError("failed to fetch Gmail message", fetched, messageId = item.id);
            continue;
        }
        logEmailCorrespondence(db, fetched, departmentId);
    }
}

function correspondenceExistsForGmailMessage(postgresql:Client db, string gmailMessageId) returns boolean {
    int|sql:Error count = db->queryRow(`SELECT COUNT(*) FROM correspondence WHERE gmail_message_id = ${gmailMessageId}`);
    return count is int && count > 0;
}

function logEmailCorrespondence(postgresql:Client db, GmailMessage message, string? departmentId) {
    string senderName = headerValue(message, "From");
    string subject = headerValue(message, "Subject");
    string receivedDate = todayDate();
    string? internalDate = message.internalDate;
    if internalDate is string {
        int|error millis = int:fromString(internalDate);
        if millis is int {
            time:Utc utc = [millis / 1000, <decimal>(millis % 1000) / 1000];
            receivedDate = time:utcToString(utc).substring(0, 10);
        }
    }
    string id = uuid:createRandomUuid();
    sql:ExecutionResult|sql:Error inserted = db->execute(`
        INSERT INTO correspondence (id, source, sender_name, category, status, department_id, received_date, due_date, scanned_document_url, gmail_message_id)
        VALUES (${id}, 'email', ${senderName}, ${subject}, 'new', ${departmentId}, ${new sql:DateValue(receivedDate)}, NULL, NULL, ${message.id})`);
    if inserted is sql:Error {
        log:printError("failed to log email correspondence", inserted, gmailMessageId = message.id);
        return;
    }
    error? movementResult = insertMovement(db, id, (), departmentId, "captured-email", "email-intake");
    if movementResult is error {
        log:printError("failed to record movement for captured email", movementResult);
    }
}

// Every active department with a configured mailbox, plus the organization
// default derived from GMAIL_WORKSPACE_DOMAIN (a "correspondence@<domain>"
// mailbox) when no department claims one. mailboxConfig is documented as an
// opaque per-department string; this module treats it as the mailbox address
// to impersonate.
function pollAllMailboxes() {
    postgresql:Client? maybeDb = dbClient;
    if maybeDb is () {
        return;
    }
    postgresql:Client db = maybeDb;
    if gmailServiceAccountJson.trim() == "" {
        return;
    }
    stream<record {|string id; string? mailboxConfig;|}, sql:Error?> rows = db->query(`
        SELECT id, mailbox_config AS mailboxConfig FROM departments WHERE status = 'active'`);
    error? iterResult = rows.forEach(function(record {|string id; string? mailboxConfig;|} row) {
        string? mailbox = row.mailboxConfig;
        if mailbox is string && mailbox.trim() != "" {
            pollMailbox(db, mailbox, row.id);
        }
    });
    if iterResult is error {
        log:printError("failed to load departments for Gmail polling", iterResult);
        return;
    }
    if gmailWorkspaceDomain.trim() != "" {
        pollMailbox(db, "correspondence@" + gmailWorkspaceDomain, ());
    }
}

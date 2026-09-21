// Every platform-injected setting, read once, by name. Every one of these may be
// blank in this environment: the service must still start and answer requests,
// and only the specific call that needs a real credential fails gracefully.

import ballerina/os;

// correspondence-db (platform-resource, postgres-cnpg)
configurable string dbHost = os:getEnv("CORRESPONDENCE_DB_HOST");
configurable string dbPort = os:getEnv("CORRESPONDENCE_DB_PORT");
configurable string dbUser = os:getEnv("CORRESPONDENCE_DB_USER");
configurable string dbPassword = os:getEnv("CORRESPONDENCE_DB_PASSWORD");
configurable string dbName = os:getEnv("CORRESPONDENCE_DB_DBNAME");

// aws-s3 (external)
configurable string awsAccessKeyId = os:getEnv("AWS_ACCESS_KEY_ID");
configurable string awsSecretAccessKey = os:getEnv("AWS_SECRET_ACCESS_KEY");
configurable string awsRegion = os:getEnv("AWS_REGION");
configurable string s3BucketName = os:getEnv("S3_BUCKET_NAME");

// email-service (external)
configurable string emailServiceBaseUrl = os:getEnv("EMAIL_SERVICE_BASE_URL");

// sms-service (external)
configurable string smsServiceUrl = os:getEnv("SMS_SERVICE_URL");

// email-intake (external) — Gmail domain-wide-delegated service account
configurable string gmailServiceAccountJson = os:getEnv("GMAIL_SERVICE_ACCOUNT_JSON");
configurable string gmailWorkspaceDomain = os:getEnv("GMAIL_WORKSPACE_DOMAIN");

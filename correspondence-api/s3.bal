// Presigned S3 upload URLs. Per aws-s3's consumptionInstructions: this
// service never proxies file bytes, only ever mints a short-lived,
// single-object presigned URL with the AWS SDK's own SigV4 signing.

import ballerina/log;
import ballerina/uuid;
import ballerinax/aws;
import ballerinax/aws.s3;

final s3:Client? s3Client = initS3Client();

function initS3Client() returns s3:Client? {
    if awsAccessKeyId.trim() == "" || awsSecretAccessKey.trim() == "" || s3BucketName.trim() == "" {
        log:printWarn("AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET_NAME not fully set — "
                + "attachment upload URLs cannot be generated until aws-s3 is configured");
        return ();
    }
    aws:Region|string region = awsRegion.trim() == "" ? aws:US_EAST_1 : awsRegion;
    s3:Client|error c = new ({region, auth: {accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey}});
    if c is error {
        log:printError("failed to create aws-s3 client", c);
        return ();
    }
    return c;
}

function sanitizeFileName(string fileName) returns string {
    string sanitized = re `[^A-Za-z0-9._-]`.replaceAll(fileName, "_");
    return sanitized;
}

function createAttachmentUploadUrl(AttachmentUploadRequest payload) returns AttachmentUploadCreated|ErrorBadRequest|ErrorInternal {
    if payload.fileName.trim() == "" {
        return <ErrorBadRequest>{body: {code: 400, message: "fileName is required"}};
    }
    s3:Client? activeClient = s3Client;
    if activeClient is () {
        return <ErrorInternal>{body: {code: 500, message: "attachment storage unavailable", description: "aws-s3 is not configured"}};
    }
    string objectKey = "correspondence-api/" + uuid:createRandomUuid() + "-" + sanitizeFileName(payload.fileName);
    string|s3:Error presigned = activeClient->createPresignedUrl(s3BucketName, objectKey, expirationMinutes = 15, httpMethod = s3:PUT);
    if presigned is s3:Error {
        log:printError("failed to create presigned upload URL", presigned);
        return <ErrorInternal>{body: {code: 500, message: "failed to create upload URL"}};
    }
    string region = awsRegion.trim() == "" ? "us-east-1" : awsRegion;
    string fileUrl = string `https://${s3BucketName}.s3.${region}.amazonaws.com/${objectKey}`;
    return <AttachmentUploadCreated>{body: {uploadUrl: presigned, fileUrl}};
}

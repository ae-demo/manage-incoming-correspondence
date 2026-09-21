// SMS dispatch via sms-service. Kept ready for the day a directory dependency
// supplies a phone number (see notify.bal's contract-gap note) — until then
// `lookupPhoneNumber` never returns one, so this is never actually invoked.

import ballerina/log;
import correspondence_api.smsservice;

final smsservice:Client? smsClient = initSmsClient();

function initSmsClient() returns smsservice:Client? {
    if smsServiceUrl.trim() == "" {
        log:printWarn("SMS_SERVICE_URL is not set — SMS notifications will be skipped");
        return ();
    }
    smsservice:Client|error c = new (serviceUrl = smsServiceUrl);
    if c is error {
        log:printError("failed to create sms-service client", c);
        return ();
    }
    return c;
}

function sendSms(string phoneNumber, string body) {
    smsservice:Client? sender = smsClient;
    if sender is () {
        return;
    }
    smsservice:SmsMessage|error result = sender->/sms.post({to: phoneNumber, body});
    if result is error {
        log:printError("failed to send SMS notification", result, phoneNumber = phoneNumber);
    }
}

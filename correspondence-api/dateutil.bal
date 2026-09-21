// Small date helpers. Every "date" in this service is a plain "YYYY-MM-DD"
// string, matching the openapi.yaml `format: date` fields.

import ballerina/time;

function todayDate() returns string {
    time:Utc nowUtc = time:utcNow();
    string rfc3339 = time:utcToString(nowUtc);
    return rfc3339.substring(0, 10);
}

// Adds `days` calendar days to a "YYYY-MM-DD" string. Falls back to the input
// unchanged if it cannot be parsed — a bad stored date must not crash a read.
function addDaysToDate(string dateStr, int days) returns string {
    time:Utc|time:Error parsed = time:utcFromString(dateStr + "T00:00:00.000Z");
    if parsed is time:Error {
        return dateStr;
    }
    time:Utc shifted = time:utcAddSeconds(parsed, <decimal>days * 86400);
    string rfc3339 = time:utcToString(shifted);
    return rfc3339.substring(0, 10);
}

// Whole days between two "YYYY-MM-DD" strings (to - from). 0 when either is
// unparsable, rather than failing the whole aggregate computation.
function daysBetween(string fromDate, string toDate) returns int {
    time:Utc|time:Error fromUtc = time:utcFromString(fromDate + "T00:00:00.000Z");
    time:Utc|time:Error toUtc = time:utcFromString(toDate + "T00:00:00.000Z");
    if fromUtc is time:Error || toUtc is time:Error {
        return 0;
    }
    decimal fromSeconds = <decimal>fromUtc[0];
    decimal toSeconds = <decimal>toUtc[0];
    decimal diffSeconds = toSeconds - fromSeconds;
    int days = <int>(diffSeconds / 86400);
    return days;
}

function isBeforeToday(string dateStr) returns boolean {
    return dateStr < todayDate();
}

// Public API types — must mirror specs/design/components/correspondence-api/openapi.yaml
// exactly: same fields, same status codes wrapped in these records.

import ballerina/http;

public type ErrorPayload record {|
    int code;
    string message;
    string description?;
    string moreInfo?;
|};

public type Department record {|
    string id;
    string name;
    "active"|"deactivated" status;
    string? mailboxConfig = ();
    int defaultTurnaroundDays;
|};

public type Correspondence record {|
    string id;
    "physical"|"email" 'source;
    string senderName?;
    string category?;
    "new"|"routed"|"in-progress"|"responded"|"closed" status;
    string? departmentId = ();
    string receivedDate;
    string? dueDate = ();
    boolean overdue = false;
    string? scannedDocumentUrl = ();
|};

public type CorrespondenceCreate record {|
    string senderName;
    string category;
    string scannedDocumentUrl;
|};

public type Movement record {|
    string id;
    string correspondenceId;
    string? fromDepartmentId = ();
    string? toDepartmentId = ();
    string action;
    string actorUserId;
    string occurredAt;
|};

public type ResponseRecord record {|
    string correspondenceId;
    string? note = ();
    string? attachmentUrl = ();
    string recordedAt?;
|};

public type UserOnboarding record {|
    string id;
    string userId;
    string departmentId;
    "RegistryOfficer"|"DepartmentOfficer"|"Supervisor" role;
|};

public type DepartmentSlaPerformance record {|
    string departmentId;
    string departmentName;
    decimal averageDays;
    decimal bestDays;
    string worstLabel;
|};

// Request bodies

public type RouteRequest record {|
    string departmentId;
|};

public type ReassignRequest record {|
    string departmentId;
|};

public type StatusUpdateRequest record {|
    string status;
|};

public type ResponseCreateRequest record {|
    string note?;
    string attachmentUrl?;
|};

public type DepartmentCreateRequest record {|
    string name;
    int defaultTurnaroundDays?;
|};

public type DepartmentUpdateRequest record {|
    string name?;
    string mailboxConfig?;
    int defaultTurnaroundDays?;
|};

public type UserOnboardRequest record {|
    string userId;
    string departmentId;
    "RegistryOfficer"|"DepartmentOfficer"|"Supervisor" role;
|};

public type AttachmentUploadRequest record {|
    string fileName;
|};

public type AttachmentUploadResponse record {|
    string uploadUrl;
    string fileUrl;
|};

// Pagination envelopes

public type CorrespondencePage record {|
    int count;
    string? next = ();
    string? previous = ();
    Correspondence[] data;
|};

public type MovementPage record {|
    int count;
    Movement[] data;
|};

public type DepartmentPage record {|
    int count;
    Department[] data;
|};

public type UserOnboardingPage record {|
    int count;
    UserOnboarding[] data;
|};

public type SlaPerformancePage record {|
    DepartmentSlaPerformance[] data;
|};

// http:<Status> wrappers

public type CorrespondenceCreated record {|
    *http:Created;
    Correspondence body;
|};

public type CorrespondenceOk record {|
    *http:Ok;
    Correspondence body;
|};

public type CorrespondencePageOk record {|
    *http:Ok;
    CorrespondencePage body;
|};

public type MovementPageOk record {|
    *http:Ok;
    MovementPage body;
|};

public type DepartmentOk record {|
    *http:Ok;
    Department body;
|};

public type DepartmentCreated record {|
    *http:Created;
    Department body;
|};

public type DepartmentPageOk record {|
    *http:Ok;
    DepartmentPage body;
|};

public type UserOnboardingPageOk record {|
    *http:Ok;
    UserOnboardingPage body;
|};

public type UserOnboardingCreated record {|
    *http:Created;
    UserOnboarding body;
|};

public type ResponseCreated record {|
    *http:Created;
    ResponseRecord body;
|};

public type AttachmentUploadCreated record {|
    *http:Created;
    AttachmentUploadResponse body;
|};

public type SlaPerformanceOk record {|
    *http:Ok;
    SlaPerformancePage body;
|};

public type ErrorBadRequest record {|
    *http:BadRequest;
    ErrorPayload body;
|};

public type ErrorNotFound record {|
    *http:NotFound;
    ErrorPayload body;
|};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    ErrorPayload body;
|};

public type ErrorInternal record {|
    *http:InternalServerError;
    ErrorPayload body;
|};

// Internal (non-API) domain records

public type NotificationRecord record {|
    string id;
    string userId;
    string channel;
    string reason;
    string sentAt;
|};

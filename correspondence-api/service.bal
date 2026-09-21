// The Correspondence API — implements specs/design/components/correspondence-api/openapi.yaml
// exactly: same paths, schemas and status codes. The gateway has already
// enforced every operation's scope from that same contract before a request
// reaches here, so no handler below holds a scope check of its own — only
// the caller's identity (for a `/me/...` operation) and the row's own reach.

import ballerina/http;

listener http:Listener ep0 = new (9090);

service http:InterceptableService / on ep0 {

    public function createInterceptors() returns AssertionInterceptor => new;

    // ---- /correspondence ----------------------------------------------

    resource function get correspondence(string? sender, string? departmentId, string? status, boolean? overdue,
            int 'limit = 20, int offset = 0) returns CorrespondencePageOk|ErrorInternal {
        return listCorrespondence(sender, departmentId, status, overdue, 'limit, offset);
    }

    resource function post correspondence(http:RequestContext ctx, @http:Payload CorrespondenceCreate payload)
            returns CorrespondenceCreated|ErrorBadRequest|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        return logCorrespondence(payload, caller.userId);
    }

    resource function get correspondence/[string correspondenceId]()
            returns CorrespondenceOk|ErrorNotFound|ErrorInternal {
        return getCorrespondence(correspondenceId);
    }

    resource function get correspondence/[string correspondenceId]/movements()
            returns MovementPageOk|ErrorNotFound|ErrorInternal {
        return listCorrespondenceMovements(correspondenceId);
    }

    resource function post correspondence/[string correspondenceId]/route(http:RequestContext ctx,
            @http:Payload RouteRequest payload)
            returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        return routeCorrespondence(correspondenceId, payload, caller.userId);
    }

    resource function post correspondence/[string correspondenceId]/reassign(http:RequestContext ctx,
            @http:Payload ReassignRequest payload)
            returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        return reassignCorrespondence(correspondenceId, payload, caller.userId);
    }

    resource function post correspondence/attachment\-upload\-url(@http:Payload AttachmentUploadRequest payload)
            returns AttachmentUploadCreated|ErrorBadRequest|ErrorInternal {
        return createAttachmentUploadUrl(payload);
    }

    // ---- /me/department/correspondence ---------------------------------

    resource function get me/department/correspondence(http:RequestContext ctx, string? status,
            int 'limit = 20, int offset = 0) returns CorrespondencePageOk|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string|http:InternalServerError username = requireCallerUsername(caller);
        if username !is string {
            return <ErrorInternal>{body: {code: 500, message: "caller has no username"}};
        }
        return listMyDepartmentCorrespondence(username, status, 'limit, offset);
    }

    resource function get me/department/correspondence/[string correspondenceId](http:RequestContext ctx)
            returns CorrespondenceOk|ErrorNotFound|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string|http:InternalServerError username = requireCallerUsername(caller);
        if username !is string {
            return <ErrorInternal>{body: {code: 500, message: "caller has no username"}};
        }
        return getMyDepartmentCorrespondence(username, correspondenceId);
    }

    resource function get me/department/correspondence/[string correspondenceId]/movements(http:RequestContext ctx)
            returns MovementPageOk|ErrorNotFound|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string|http:InternalServerError username = requireCallerUsername(caller);
        if username !is string {
            return <ErrorInternal>{body: {code: 500, message: "caller has no username"}};
        }
        return listMyDepartmentCorrespondenceMovements(username, correspondenceId);
    }

    resource function patch me/department/correspondence/[string correspondenceId]/status(http:RequestContext ctx,
            @http:Payload StatusUpdateRequest payload)
            returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string|http:InternalServerError username = requireCallerUsername(caller);
        if username !is string {
            return <ErrorInternal>{body: {code: 500, message: "caller has no username"}};
        }
        return updateMyDepartmentCorrespondenceStatus(username, correspondenceId, payload);
    }

    resource function post me/department/correspondence/[string correspondenceId]/response(http:RequestContext ctx,
            @http:Payload ResponseCreateRequest payload)
            returns ResponseCreated|ErrorBadRequest|ErrorNotFound|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string|http:InternalServerError username = requireCallerUsername(caller);
        if username !is string {
            return <ErrorInternal>{body: {code: 500, message: "caller has no username"}};
        }
        return recordMyDepartmentCorrespondenceResponse(username, correspondenceId, payload);
    }

    resource function post me/department/correspondence/[string correspondenceId]/close(http:RequestContext ctx)
            returns CorrespondenceOk|ErrorBadRequest|ErrorNotFound|ErrorInternal|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller !is GatewayCaller {
            return caller;
        }
        string|http:InternalServerError username = requireCallerUsername(caller);
        if username !is string {
            return <ErrorInternal>{body: {code: 500, message: "caller has no username"}};
        }
        return closeMyDepartmentCorrespondence(username, correspondenceId);
    }

    // ---- /departments ----------------------------------------------------

    resource function get departments(int 'limit = 20, int offset = 0) returns DepartmentPageOk|ErrorInternal {
        return listDepartments('limit, offset);
    }

    resource function post departments(@http:Payload DepartmentCreateRequest payload)
            returns DepartmentCreated|ErrorBadRequest|ErrorInternal {
        return createDepartment(payload);
    }

    resource function patch departments/[string departmentId](@http:Payload DepartmentUpdateRequest payload)
            returns DepartmentOk|ErrorNotFound|ErrorInternal {
        return updateDepartment(departmentId, payload);
    }

    resource function post departments/[string departmentId]/deactivate()
            returns DepartmentOk|ErrorNotFound|ErrorInternal {
        return deactivateDepartment(departmentId);
    }

    // ---- /users ------------------------------------------------------------

    resource function get users(int 'limit = 20, int offset = 0) returns UserOnboardingPageOk|ErrorInternal {
        return listOnboardedUsers('limit, offset);
    }

    resource function post users/onboard(@http:Payload UserOnboardRequest payload)
            returns UserOnboardingCreated|ErrorBadRequest|ErrorInternal {
        return onboardUser(payload);
    }

    // ---- /public -------------------------------------------------------------
    // security: [] — no assertion is minted for this operation, so no identity
    // is read here at all.

    resource function get 'public/departments/sla\-performance() returns SlaPerformanceOk|ErrorInternal {
        return listPublicDepartmentSlaPerformance();
    }
}

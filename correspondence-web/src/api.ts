import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/correspondence-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// Nothing about authorization lives here beyond wiring the two functions
// authz/client.ts exports: attach the bearer, and let classifyResponse decide
// what an unauthorized answer means (Forbidden vs. a fresh sign-in). The 401
// rule itself is authz/client.ts's, not this file's.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

// Same-origin: nginx in this pod reverse-proxies /api to correspondence-api
// through the gateway. OpenAPI paths stay exactly as the contract declares
// them (/correspondence, /me/department/correspondence, …).
export const correspondenceApi = createClient<paths>({ baseUrl: "/api" });
correspondenceApi.use(authMiddleware);

// The keys the platform actually emits for this component: the
// correspondence-auth dependency's OIDC config, and nothing else — a sibling
// API address is never a browser key (react-webapp's Constraints).
export const mockEnv = {
  CORRESPONDENCE_AUTH_CLIENT_ID: "mock-client",
  CORRESPONDENCE_AUTH_ISSUER: "https://mock-idp.test",
  // No CORRESPONDENCE_AUTH_JWKS_URL: the platform emits it, but src/env.ts does
  // not declare it — the browser never validates a token, the API gateway does.
  CORRESPONDENCE_AUTH_SCOPES:
    "openid profile email group ou correspondence:log correspondence:read correspondence:read-all " +
    "correspondence:route correspondence:reassign correspondence:update-status correspondence:respond " +
    "correspondence:close departments:read departments:manage users:read users:onboard",
  CORRESPONDENCE_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};

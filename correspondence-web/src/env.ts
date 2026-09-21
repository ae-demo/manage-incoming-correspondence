type Env = {
  // The correspondence-auth (thunder-app) dependency's OIDC config. All four
  // are required — RESOURCE especially, since without it the token's `aud` is
  // wrong and every /api call 401s while sign-in looks healthy. The dependency
  // also emits CORRESPONDENCE_AUTH_JWKS_URL; it is NOT declared here because the
  // browser never validates a token — the API gateway does.
  CORRESPONDENCE_AUTH_CLIENT_ID: string;
  CORRESPONDENCE_AUTH_ISSUER: string;
  CORRESPONDENCE_AUTH_SCOPES: string;
  CORRESPONDENCE_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;

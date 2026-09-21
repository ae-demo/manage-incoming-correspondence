// This app has no OIDC dependency and no `configurations.env` defaults, so
// window._env_ carries no keys this app reads — the sibling correspondence-api
// is reached same-origin at /api (react-webapp), never through window._env_.
// The platform still mounts /env-config.js and sets window._env_ to an empty
// object; this module only proves that the file loaded.
type Env = Record<string, never>;

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

// This app declares no OIDC dependency and no `configurations.env` defaults
// (src/env.ts), so window._env_ carries no keys in production and mockEnv
// carries none here either — adding one to make a screen "work" would hide
// the exact defect this arrangement exists to catch.
export const mockEnv = {};

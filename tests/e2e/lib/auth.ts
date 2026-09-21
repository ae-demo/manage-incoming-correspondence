import type { Browser, Page } from "@playwright/test";

// The deployed app's own SSO auto-check (visiting "/" while signed out) never
// completes — see the validation report. "/auth/login" is the gateway-provided
// redirect that actually reaches the IdP's hosted sign-in page and works.
export type Role = "admin" | "registryOfficer" | "departmentOfficer" | "departmentOfficer2" | "supervisor";

const ENV_KEY: Record<Role, string> = {
  admin: "ADMIN",
  registryOfficer: "REGISTRY",
  departmentOfficer: "DEPT",
  departmentOfficer2: "DEPT2",
  supervisor: "SUPERVISOR",
};

export function credentials(role: Role): { username: string; password: string } {
  const key = ENV_KEY[role];
  const username = process.env[`AEP_E2E_USERNAME_${key}`];
  const password = process.env[`AEP_E2E_PASSWORD_${key}`];
  if (!username || !password) {
    throw new Error(
      `missing credentials for role "${role}": set AEP_E2E_USERNAME_${key} and AEP_E2E_PASSWORD_${key}`,
    );
  }
  return { username, password };
}

export async function signIn(page: Page, role: Role): Promise<void> {
  const { username, password } = credentials(role);
  // "/auth/login" usually redirects straight to the IdP's hosted sign-in page,
  // but occasionally the SPA's shell renders first and starts its own broken
  // client-side session check (the same CORS-blocked discovery fetch that
  // hangs "/" forever — see the validation report) before the server-side
  // redirect wins the race. Retrying the navigation gives the server redirect
  // another chance rather than waiting out a hang that never resolves.
  const usernameBox = page.getByRole("textbox", { name: "Username" });
  let landed = false;
  for (let attempt = 0; attempt < 4 && !landed; attempt++) {
    await page.goto("/auth/login");
    try {
      await usernameBox.waitFor({ state: "visible", timeout: 15_000 });
      landed = true;
    } catch {
      // try again
    }
  }
  if (!landed) throw new Error('sign-in page never appeared after 4 attempts at "/auth/login"');
  await usernameBox.fill(username);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login") && !url.pathname.startsWith("/callback"), {
    timeout: 12_000,
  });
  // The URL lands on its post-login route slightly before the SPA finishes
  // persisting the exchanged token to localStorage. A caller that immediately
  // reloads or navigates (a real navigation, not client-side routing) can race
  // that write and land back on the sign-in page. Wait for the token itself.
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith("oidc.user")), {
    timeout: 10_000,
  });
}

// The SPA (oidc-client-ts) parks the OAuth token in localStorage under a key
// prefixed "oidc.user:"; setup helpers that seed data via the API fixture need
// this to authenticate the same session the UI test is driving.
export async function getAccessToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("oidc.user"));
    if (!key) throw new Error("no oidc session found in localStorage — sign in first");
    return JSON.parse(localStorage.getItem(key)!).access_token as string;
  });
}

// Setup-only: mint a token for a second role in a throwaway context, for specs
// that need e.g. an Admin token to onboard a user before driving the main
// `page` as a different, already-signed-in role.
export async function getRoleToken(browser: Browser, role: Role): Promise<string> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await signIn(page, role);
    return await getAccessToken(page);
  } finally {
    await context.close();
  }
}

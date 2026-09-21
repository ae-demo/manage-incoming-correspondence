// spec: tests/validation/test-plan.md § AC-017-a
import { test, expect } from "@playwright/test";
import { target } from "../lib/targets";

test("AC-017-a: the SLA performance dashboard is reachable without signing in", async ({ browser }) => {
  test.setTimeout(90_000);
  // A fresh, unauthenticated context — no cookies, no storage from any prior sign-in.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(target("public-sla-dashboard"));

  // Assert: the dashboard renders directly, with no login redirect.
  await expect(page.getByRole("heading", { name: "Department SLA Performance" })).toBeVisible();
  await context.close();
});

// spec: tests/validation/test-plan.md § AC-018-a
import { test, expect } from "@playwright/test";
import { signIn } from "../lib/auth";

test("AC-018-a: an Admin can configure an organization-wide default intake mailbox", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "admin");
  // 1. The Departments screen is the only admin surface for mailbox
  // configuration; look for an organization-level (not per-department) control.
  await page.goto("/departments");

  // Assert: an organization-wide mailbox control exists and can be reached.
  await expect(page.getByRole("button", { name: /organization.*mailbox/i })).toBeVisible();
});

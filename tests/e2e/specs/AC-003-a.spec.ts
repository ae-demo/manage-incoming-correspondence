// spec: tests/validation/test-plan.md § AC-003-a
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken } from "../lib/auth";
import { logCorrespondence } from "../lib/seed";

test("AC-003-a: Registry Officer views a list of newly logged, unrouted correspondence items", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const sender = `E2E Unrouted ${Date.now()}`;
  await logCorrespondence(request, token, sender);

  // 1. Open the inbox
  await page.goto("/inbox");
  // Assert: the seeded unrouted item is listed.
  await expect(page.getByRole("cell", { name: sender })).toBeVisible();
});

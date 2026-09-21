// spec: tests/validation/test-plan.md § AC-012-a
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken } from "../lib/auth";
import { logCorrespondence } from "../lib/seed";

test("AC-012-a: Registry Officer can filter correspondence by sender", async ({ page, request }) => {
  test.setTimeout(90_000);
  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const run = Date.now();
  const senderA = `E2E FilterSender A ${run}`;
  const senderB = `E2E FilterSender B ${run}`;
  await logCorrespondence(request, token, senderA);
  await logCorrespondence(request, token, senderB);

  // 1. Open Search and filter by one sender's name
  await page.goto("/search");
  await page.getByRole("textbox", { name: "Sender" }).fill(senderA);

  // Assert: only the matching sender is shown.
  await expect(page.getByRole("cell", { name: senderA })).toBeVisible();
  await expect(page.getByRole("cell", { name: senderB })).not.toBeVisible();
});

// spec: tests/validation/test-plan.md § AC-010-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-010-b: an item not yet past its due date is not flagged as overdue", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E NotOverdue Dept ${run}`, 10);
  const sender = `E2E NotOverdue Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);

  await signIn(page, "supervisor");
  await page.goto("/dashboard");
  // Assert: the item's Overdue cell reads "No".
  await expect(page.getByRole("row", { name: new RegExp(`${sender}.*No`) })).toBeVisible();
});

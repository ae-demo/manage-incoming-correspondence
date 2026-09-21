// spec: tests/validation/test-plan.md § AC-010-a
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-010-a: an item past its due date is visibly flagged as overdue", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  // A negative turnaround puts the computed due date in the past — there is
  // no admin control to backdate an item directly, so this is the only way to
  // produce an overdue item within a same-day test run (see test-plan.md).
  const dept = await createDepartment(request, adminToken, `E2E Overdue Dept ${run}`, -5);
  const sender = `E2E Overdue Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);

  await signIn(page, "supervisor");
  await page.goto("/dashboard");
  // Assert: the item's Overdue cell reads "Yes".
  await expect(page.getByRole("row", { name: new RegExp(`${sender}.*Yes`) })).toBeVisible();
});

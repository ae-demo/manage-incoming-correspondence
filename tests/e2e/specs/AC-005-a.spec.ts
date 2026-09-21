// spec: tests/validation/test-plan.md § AC-005-a
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-005-a: Department Officer views correspondence assigned to their own department", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E MyDept ${run}`);
  const sender = `E2E MyDept Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  // 1. Open My Queue
  await page.goto("/my-queue");
  // Assert: the item routed to this officer's department is listed.
  await expect(page.getByRole("cell", { name: sender })).toBeVisible();
});

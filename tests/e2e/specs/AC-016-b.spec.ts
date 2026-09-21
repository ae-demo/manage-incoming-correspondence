// spec: tests/validation/test-plan.md § AC-016-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-016-b: after onboarding, the user can access correspondence relevant to their role and department", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E OnboardAccess Dept ${run}`);
  const sender = `E2E OnboardAccess Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);

  // 1. Onboard the Department Officer test user into this department
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  // 2. Sign in as that user and open their queue
  await signIn(page, "departmentOfficer");
  await page.goto("/my-queue");

  // Assert: the correspondence routed to their new department is accessible.
  await expect(page.getByRole("cell", { name: sender })).toBeVisible();
});

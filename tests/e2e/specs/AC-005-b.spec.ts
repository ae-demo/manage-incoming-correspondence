// spec: tests/validation/test-plan.md § AC-005-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-005-b: Department Officer does not see another department's correspondence", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const ownDept = await createDepartment(request, adminToken, `E2E OwnDept ${run}`);
  const otherDept = await createDepartment(request, adminToken, `E2E OtherDept ${run}`);
  const otherSender = `E2E OtherDept Sender ${run}`;
  const otherItem = await logCorrespondence(request, registryToken, otherSender);
  await routeCorrespondence(request, registryToken, otherItem.id, otherDept.id);
  await onboardUser(
    request,
    adminToken,
    credentials("departmentOfficer2").username,
    ownDept.id,
    "DepartmentOfficer",
  );

  await signIn(page, "departmentOfficer2");
  // 1. Open My Queue
  await page.goto("/my-queue");
  // Assert: the other department's item is not present in this officer's queue.
  await expect(page.getByRole("cell", { name: otherSender })).not.toBeVisible();
});

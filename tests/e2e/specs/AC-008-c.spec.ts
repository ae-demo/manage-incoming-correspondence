// spec: tests/validation/test-plan.md § AC-008-c
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-008-c: an item with no recorded response cannot be closed", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E NoResponse Dept ${run}`);
  const item = await logCorrespondence(request, registryToken, `E2E NoResponse Sender ${run}`);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  // 1. Open the item's detail page without recording any response
  await page.goto(`/me/department/correspondence/${item.id}`);
  // Assert: Close Item is disabled.
  await expect(page.getByRole("button", { name: "Close Item" })).toBeDisabled();
});

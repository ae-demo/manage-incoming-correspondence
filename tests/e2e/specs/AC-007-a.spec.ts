// spec: tests/validation/test-plan.md § AC-007-a
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-007-a: Department Officer records a response note against a correspondence item", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E Respond Dept ${run}`);
  const item = await logCorrespondence(request, registryToken, `E2E Respond Sender ${run}`);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  // 1. Open the item's detail page
  await page.goto(`/me/department/correspondence/${item.id}`);
  // 2. Record a response note (attachment path is not exercised here — see
  // AC-001-a for the separately-reported attachment-upload defect)
  await page.getByRole("textbox", { name: "Response note" }).fill("Resolved per phone call with sender.");
  await page.getByRole("button", { name: "Save Response" }).click();

  // Assert: the item's status becomes Responded and Close Item is now available.
  await expect(page.getByText("Responded", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close Item" })).toBeEnabled();
});

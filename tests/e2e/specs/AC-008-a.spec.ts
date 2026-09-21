// spec: tests/validation/test-plan.md § AC-008-a
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-008-a: Department Officer closes a correspondence item that has a recorded response", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E Close Dept ${run}`);
  const item = await logCorrespondence(request, registryToken, `E2E Close Sender ${run}`);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  await page.goto(`/me/department/correspondence/${item.id}`);
  await page.getByRole("textbox", { name: "Response note" }).fill("Resolved.");
  await page.getByRole("button", { name: "Save Response" }).click();
  await expect(page.getByRole("button", { name: "Close Item" })).toBeEnabled();

  // Close the item
  await page.getByRole("button", { name: "Close Item" }).click();

  // Assert: the item's status becomes Closed.
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
});

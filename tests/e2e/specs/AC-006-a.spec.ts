// spec: tests/validation/test-plan.md § AC-006-a
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-006-a: Department Officer changes the status of an item assigned to their department", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E Status Dept ${run}`);
  const item = await logCorrespondence(request, registryToken, `E2E Status Sender ${run}`);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  // 1. Open the item's detail page
  await page.goto(`/me/department/correspondence/${item.id}`);
  // 2. Set status to In Progress
  await page.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "In Progress" }).click();
  await page.getByRole("button", { name: "Update Status" }).click();

  // Assert: the header badge reflects the new status.
  await expect(page.getByText("In Progress")).toBeVisible();
});

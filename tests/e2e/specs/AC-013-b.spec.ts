// spec: tests/validation/test-plan.md § AC-013-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-013-b: a correspondence item's movement history lists the actions taken on it", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E Actions Dept ${run}`);
  const item = await logCorrespondence(request, registryToken, `E2E Actions Sender ${run}`);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  // Department Officer updates the status, adding a second action to history.
  const officerContext = await browser.newContext();
  const officerPage = await officerContext.newPage();
  await signIn(officerPage, "departmentOfficer");
  await officerPage.goto(`/me/department/correspondence/${item.id}`);
  await officerPage.getByRole("combobox", { name: "Status" }).click();
  await officerPage.getByRole("option", { name: "In Progress" }).click();
  await officerPage.getByRole("button", { name: "Update Status" }).click();
  await officerContext.close();

  // 1. Open the item's detail page as Registry Officer (read-all)
  await signIn(page, "registryOfficer");
  await page.goto(`/correspondence/${item.id}`);
  // Assert: both the routing action and the status-change action are listed.
  await expect(page.getByRole("row", { name: /routed/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /status:in-progress/ })).toBeVisible();
});

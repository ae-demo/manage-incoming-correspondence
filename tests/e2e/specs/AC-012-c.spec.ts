// spec: tests/validation/test-plan.md § AC-012-c
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-012-c: Registry Officer can filter correspondence by status", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E FilterStatus Dept ${run}`);
  const closedSender = `E2E FilterStatus Closed ${run}`;
  const openSender = `E2E FilterStatus Open ${run}`;
  const closedItem = await logCorrespondence(request, registryToken, closedSender);
  const openItem = await logCorrespondence(request, registryToken, openSender);
  await routeCorrespondence(request, registryToken, closedItem.id, dept.id);
  await routeCorrespondence(request, registryToken, openItem.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  // Close one of the two items via the Department Officer flow.
  const officerContext = await browser.newContext();
  const officerPage = await officerContext.newPage();
  await signIn(officerPage, "departmentOfficer");
  await officerPage.goto(`/me/department/correspondence/${closedItem.id}`);
  await officerPage.getByRole("textbox", { name: "Response note" }).fill("Resolved.");
  await officerPage.getByRole("button", { name: "Save Response" }).click();
  await officerPage.getByRole("button", { name: "Close Item" }).click();
  await officerContext.close();

  // 1. Open Search and filter by status "Closed"
  await signIn(page, "registryOfficer");
  await page.goto("/search");
  await page.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "Closed" }).click();

  // Assert: only the closed item is shown.
  await expect(page.getByRole("cell", { name: closedSender })).toBeVisible();
  await expect(page.getByRole("cell", { name: openSender })).not.toBeVisible();
});

// spec: tests/validation/test-plan.md § AC-006-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-006-b: an updated status is visible to other users viewing that item", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E StatusVis Dept ${run}`);
  const sender = `E2E StatusVis Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  // Department Officer updates the status in one context.
  const officerContext = await browser.newContext();
  const officerPage = await officerContext.newPage();
  await signIn(officerPage, "departmentOfficer");
  await officerPage.goto(`/me/department/correspondence/${item.id}`);
  await officerPage.getByRole("combobox", { name: "Status" }).click();
  await officerPage.getByRole("option", { name: "In Progress" }).click();
  await officerPage.getByRole("button", { name: "Update Status" }).click();
  await officerContext.close();

  // A different user (Registry Officer, read-all) views the item via Search.
  await signIn(page, "registryOfficer");
  await page.goto("/search");
  await page.getByRole("textbox", { name: "Sender" }).fill(sender);
  // Assert: the status column shows the updated status for this other user.
  await expect(page.getByRole("row", { name: new RegExp(`${sender}.*In Progress`) })).toBeVisible();
});

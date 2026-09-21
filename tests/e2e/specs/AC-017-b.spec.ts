// spec: tests/validation/test-plan.md § AC-017-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";
import { target } from "../lib/targets";

test("AC-017-b: the SLA dashboard shows turnaround performance broken down per department", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E SlaDept ${run}`);
  const item = await logCorrespondence(request, registryToken, `E2E SlaSender ${run}`);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  // Respond and close it, so it has resolved SLA data.
  await signIn(page, "departmentOfficer");
  await page.goto(`/me/department/correspondence/${item.id}`);
  await page.getByRole("textbox", { name: "Response note" }).fill("Resolved.");
  await page.getByRole("button", { name: "Save Response" }).click();
  await page.getByRole("button", { name: "Close Item" }).click();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();

  // 1. Open the public SLA dashboard
  await page.goto(target("public-sla-dashboard"));
  // Assert: a row for this department with numeric Average/Best/Worst.
  await expect(page.getByRole("row", { name: new RegExp(`${dept.name}.*days`) })).toBeVisible();
});

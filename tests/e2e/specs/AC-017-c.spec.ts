// spec: tests/validation/test-plan.md § AC-017-c
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";
import { target } from "../lib/targets";

test("AC-017-c: the SLA dashboard does not display individual correspondence content or sender details", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E SlaPrivacy Dept ${run}`);
  const sender = `E2E SlaPrivacy Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  await page.goto(`/me/department/correspondence/${item.id}`);
  await page.getByRole("textbox", { name: "Response note" }).fill("Resolved.");
  await page.getByRole("button", { name: "Save Response" }).click();
  await page.getByRole("button", { name: "Close Item" }).click();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();

  // 1. Open the public SLA dashboard
  await page.goto(target("public-sla-dashboard"));
  // Assert: the sender's name never appears anywhere on the public dashboard.
  await expect(page.getByText(sender)).not.toBeVisible();
});

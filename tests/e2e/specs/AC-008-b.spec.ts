// spec: tests/validation/test-plan.md § AC-008-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-008-b: a closed item no longer appears in the active/open queue", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E QueueClose Dept ${run}`);
  const sender = `E2E QueueClose Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  await page.goto(`/me/department/correspondence/${item.id}`);
  await page.getByRole("textbox", { name: "Response note" }).fill("Resolved.");
  await page.getByRole("button", { name: "Save Response" }).click();
  await page.getByRole("button", { name: "Close Item" }).click();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();

  // 1. Return to My Queue (the active/open queue for this department)
  await page.goto("/my-queue");
  // Assert: the closed item is absent from the active queue.
  await expect(page.getByRole("cell", { name: sender })).not.toBeVisible();
});

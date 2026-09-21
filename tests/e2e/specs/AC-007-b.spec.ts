// spec: tests/validation/test-plan.md § AC-007-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken, credentials } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence, onboardUser } from "../lib/seed";

test("AC-007-b: the recorded response is retrievable from that correspondence item afterward", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E Retrieve Dept ${run}`);
  const item = await logCorrespondence(request, registryToken, `E2E Retrieve Sender ${run}`);
  await routeCorrespondence(request, registryToken, item.id, dept.id);
  await onboardUser(request, adminToken, credentials("departmentOfficer").username, dept.id, "DepartmentOfficer");

  await signIn(page, "departmentOfficer");
  await page.goto(`/me/department/correspondence/${item.id}`);
  const noteText = "Resolved per phone call with sender on the record.";
  await page.getByRole("textbox", { name: "Response note" }).fill(noteText);
  await page.getByRole("button", { name: "Save Response" }).click();

  // Reload the detail page fresh — the response should still be visible.
  await page.reload();
  // Assert: the previously recorded note text is shown somewhere on the page.
  await expect(page.getByText(noteText)).toBeVisible();
});

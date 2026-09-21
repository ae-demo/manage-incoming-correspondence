// spec: tests/validation/test-plan.md § AC-011-a
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-011-a: Supervisor reassigns a correspondence item to a different department", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const deptA = await createDepartment(request, adminToken, `E2E SupReassign A ${run}`);
  const deptB = await createDepartment(request, adminToken, `E2E SupReassign B ${run}`);
  const sender = `E2E SupReassign Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, deptA.id);

  await signIn(page, "supervisor");
  // 1. Select the item on the dashboard
  await page.goto("/dashboard");
  await page.getByRole("row", { name: sender }).getByRole("checkbox").click();
  // 2. Reassign it
  await page.getByRole("button", { name: "Reassign Selected" }).click();
  await page.getByRole("combobox", { name: "Department" }).click();
  await page.getByRole("option", { name: deptB.name }).click();
  await page.getByRole("button", { name: "Reassign" }).click();

  // Assert: the item now shows department B.
  await expect(page.getByText(deptB.name)).toBeVisible();
});

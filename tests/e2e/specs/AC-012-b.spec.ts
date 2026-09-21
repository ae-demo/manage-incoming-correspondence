// spec: tests/validation/test-plan.md § AC-012-b
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-012-b: Registry Officer can filter correspondence by department", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const run = Date.now();
  const deptA = await createDepartment(request, adminToken, `E2E FilterDept A ${run}`);
  const deptB = await createDepartment(request, adminToken, `E2E FilterDept B ${run}`);

  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const senderA = `E2E FilterDeptSender A ${run}`;
  const senderB = `E2E FilterDeptSender B ${run}`;
  const itemA = await logCorrespondence(request, token, senderA);
  const itemB = await logCorrespondence(request, token, senderB);
  await routeCorrespondence(request, token, itemA.id, deptA.id);
  await routeCorrespondence(request, token, itemB.id, deptB.id);

  // 1. Open Search and filter by department A
  await page.goto("/search");
  await page.getByRole("combobox", { name: "Department" }).click();
  await page.getByRole("option", { name: deptA.name }).click();

  // Assert: only department A's item is shown.
  await expect(page.getByRole("cell", { name: senderA })).toBeVisible();
  await expect(page.getByRole("cell", { name: senderB })).not.toBeVisible();
});

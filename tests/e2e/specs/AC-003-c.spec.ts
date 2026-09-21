// spec: tests/validation/test-plan.md § AC-003-c
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-003-c: after assignment, the item shows the department it was routed to", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E Detail Dept ${run}`);

  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const item = await logCorrespondence(request, token, `E2E Detail Sender ${run}`);
  await routeCorrespondence(request, token, item.id, dept.id);

  // 1. Open the item's detail page
  await page.goto(`/correspondence/${item.id}`);
  // Assert: the routed department is shown in the item's summary and history.
  await expect(page.getByText(dept.name).first()).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`routed.*${dept.name}`) })).toBeVisible();
});

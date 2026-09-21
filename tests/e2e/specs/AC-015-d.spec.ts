// spec: tests/validation/test-plan.md § AC-015-d
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken, getRoleToken } from "../lib/auth";
import { createDepartment, deactivateDepartment, logCorrespondence } from "../lib/seed";

test("AC-015-d: a deactivated department is unavailable as a routing option", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E RouteUnavailable ${run}`);
  await deactivateDepartment(request, adminToken, dept.id);

  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const item = await logCorrespondence(request, token, `E2E RouteUnavailable Sender ${run}`);

  // 1. Open the unrouted item's detail page and open the Route dropdown
  await page.goto(`/correspondence/${item.id}`);
  await page.getByRole("combobox", { name: "Department" }).click();

  // Assert: the deactivated department is not among the routing options.
  await expect(page.getByRole("option", { name: dept.name })).not.toBeVisible();
});

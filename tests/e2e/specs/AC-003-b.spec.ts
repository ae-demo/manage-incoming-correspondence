// spec: tests/validation/test-plan.md § AC-003-b
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence } from "../lib/seed";

test("AC-003-b: Registry Officer assigns a newly logged item to a department", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E Route Dept ${run}`);

  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const sender = `E2E Route Sender ${run}`;
  const item = await logCorrespondence(request, token, sender);

  // 1. Open the item's detail page
  await page.goto(`/correspondence/${item.id}`);
  // 2. Pick the department in the Route card
  await page.getByRole("combobox", { name: "Department" }).click();
  await page.getByRole("option", { name: dept.name }).click();
  // 3. Click Route
  await page.getByRole("button", { name: "Route" }).click();

  // Assert: back on the inbox, the routed item is no longer listed as new.
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole("cell", { name: sender })).not.toBeVisible();
});

// spec: tests/validation/test-plan.md § AC-004-a
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-004-a: Registry Officer changes the department assigned to an already-routed item", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const run = Date.now();
  const deptA = await createDepartment(request, adminToken, `E2E Reassign A ${run}`);
  const deptB = await createDepartment(request, adminToken, `E2E Reassign B ${run}`);

  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const item = await logCorrespondence(request, token, `E2E Reassign Sender ${run}`);
  await routeCorrespondence(request, token, item.id, deptA.id);

  // 1. Open the routed item's detail page
  await page.goto(`/correspondence/${item.id}`);
  // 2. Use the Reassign card to move it to department B
  await page.getByRole("combobox", { name: "Department" }).click();
  await page.getByRole("option", { name: deptB.name }).click();
  await page.getByRole("button", { name: "Reassign" }).click();

  // Assert: the item now shows department B.
  await expect(page.getByText(deptB.name)).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`reassigned.*${deptA.name}.*${deptB.name}`) })).toBeVisible();
});

// spec: tests/validation/test-plan.md § AC-013-a
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-013-a: a correspondence item's movement history lists who it was routed to and when", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E History Dept ${run}`);

  await signIn(page, "registryOfficer");
  const token = await getAccessToken(page);
  const item = await logCorrespondence(request, token, `E2E History Sender ${run}`);
  await routeCorrespondence(request, token, item.id, dept.id);

  // 1. Open the item's detail page
  await page.goto(`/correspondence/${item.id}`);
  // Assert: history has a "routed" row naming the destination department with a timestamp.
  const routedRow = page.getByRole("row", { name: new RegExp(`routed.*${dept.name}`) });
  await expect(routedRow).toBeVisible();
  await expect(routedRow.getByRole("cell").first()).not.toHaveText("");
});

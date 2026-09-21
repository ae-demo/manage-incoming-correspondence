// spec: tests/validation/test-plan.md § AC-009-b
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-009-b: each item on the Supervisor dashboard shows its current status", async ({ page, request, browser }) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const dept = await createDepartment(request, adminToken, `E2E DashStatus Dept ${run}`);
  const sender = `E2E DashStatus Sender ${run}`;
  const item = await logCorrespondence(request, registryToken, sender);
  await routeCorrespondence(request, registryToken, item.id, dept.id);

  await signIn(page, "supervisor");
  await page.goto("/dashboard");
  // Assert: the row for the seeded item shows its status ("Routed").
  await expect(page.getByRole("row", { name: new RegExp(`${sender}.*Routed`) })).toBeVisible();
});

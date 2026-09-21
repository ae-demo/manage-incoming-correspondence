// spec: tests/validation/test-plan.md § AC-009-a
import { test, expect } from "@playwright/test";
import { signIn, getRoleToken } from "../lib/auth";
import { createDepartment, logCorrespondence, routeCorrespondence } from "../lib/seed";

test("AC-009-a: Supervisor views a dashboard listing correspondence items from every department", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const adminToken = await getRoleToken(browser, "admin");
  const registryToken = await getRoleToken(browser, "registryOfficer");
  const run = Date.now();
  const deptA = await createDepartment(request, adminToken, `E2E Dash A ${run}`);
  const deptB = await createDepartment(request, adminToken, `E2E Dash B ${run}`);
  const senderA = `E2E Dash Sender A ${run}`;
  const senderB = `E2E Dash Sender B ${run}`;
  const itemA = await logCorrespondence(request, registryToken, senderA);
  const itemB = await logCorrespondence(request, registryToken, senderB);
  await routeCorrespondence(request, registryToken, itemA.id, deptA.id);
  await routeCorrespondence(request, registryToken, itemB.id, deptB.id);

  await signIn(page, "supervisor");
  // 1. Open the Supervisor dashboard
  await page.goto("/dashboard");
  // Assert: items from both (different) departments are listed.
  await expect(page.getByRole("cell", { name: senderA })).toBeVisible();
  await expect(page.getByRole("cell", { name: senderB })).toBeVisible();
});

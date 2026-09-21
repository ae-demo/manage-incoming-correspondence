// spec: tests/validation/test-plan.md § AC-015-b
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken } from "../lib/auth";
import { createDepartment } from "../lib/seed";

test("AC-015-b: Admin renames an existing department", async ({ page, request }) => {
  test.setTimeout(90_000);
  await signIn(page, "admin");
  const token = await getAccessToken(page);
  const run = Date.now();
  const dept = await createDepartment(request, token, `E2E Rename Before ${run}`);
  const renamed = `E2E Rename After ${run}`;

  // 1. Open the department and rename it
  await page.goto("/departments");
  await page.getByRole("row", { name: dept.name }).click();
  await page.getByRole("textbox", { name: "Name" }).fill(renamed);
  await page.getByRole("button", { name: "Save" }).click();

  // Assert: the departments table shows the new name.
  await expect(page.getByRole("cell", { name: renamed })).toBeVisible();
});

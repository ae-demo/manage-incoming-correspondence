// spec: tests/validation/test-plan.md § AC-015-c
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken } from "../lib/auth";
import { createDepartment } from "../lib/seed";

test("AC-015-c: Admin deactivates a department", async ({ page, request }) => {
  test.setTimeout(90_000);
  await signIn(page, "admin");
  const token = await getAccessToken(page);
  const dept = await createDepartment(request, token, `E2E Deactivate ${Date.now()}`);

  // 1. Open the department and deactivate it
  await page.goto("/departments");
  await page.getByRole("row", { name: dept.name }).click();
  await page.getByRole("button", { name: "Deactivate" }).click();

  // Assert: the departments table shows it as Deactivated.
  await expect(page.getByRole("row", { name: new RegExp(`${dept.name}.*Deactivated`) })).toBeVisible();
});

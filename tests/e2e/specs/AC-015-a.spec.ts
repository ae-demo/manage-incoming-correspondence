// spec: tests/validation/test-plan.md § AC-015-a
import { test, expect } from "@playwright/test";
import { signIn } from "../lib/auth";

test("AC-015-a: Admin creates a new department", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "admin");
  const name = `E2E New Dept ${Date.now()}`;

  // 1. Open Departments and start a new one
  await page.goto("/departments");
  await page.getByRole("button", { name: "New Department" }).click();
  // 2. Fill name + turnaround, save
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page.getByRole("spinbutton", { name: "Default turnaround (days)" }).fill("10");
  await page.getByRole("button", { name: "Save" }).click();

  // Assert: the new department appears as Active.
  await expect(page.getByRole("row", { name: new RegExp(`${name}.*Active`) })).toBeVisible();
});

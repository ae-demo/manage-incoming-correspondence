// spec: tests/validation/test-plan.md § AC-016-a
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken, credentials } from "../lib/auth";
import { createDepartment } from "../lib/seed";

test("AC-016-a: Admin assigns a user to a department and one of the three roles", async ({ page, request }) => {
  test.setTimeout(90_000);
  await signIn(page, "admin");
  const token = await getAccessToken(page);
  const dept = await createDepartment(request, token, `E2E Onboard Dept ${Date.now()}`);
  const username = credentials("supervisor").username;

  // 1. Open Users and onboard
  await page.goto("/users");
  await page.getByRole("button", { name: "Onboard User" }).click();
  await page.getByRole("textbox", { name: "User (Thunder identity)" }).fill(username);
  await page.getByRole("combobox", { name: "Department" }).click();
  await page.getByRole("option", { name: dept.name }).click();
  await page.getByRole("combobox", { name: "Role" }).click();
  await page.getByRole("option", { name: "Supervisor" }).click();
  await page.getByRole("button", { name: "Onboard" }).click();

  // Assert: the onboarded user is listed with that department and role.
  await expect(page.getByRole("row", { name: new RegExp(`${username}.*${dept.name}.*Supervisor`) })).toBeVisible();
});

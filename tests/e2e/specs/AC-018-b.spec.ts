// spec: tests/validation/test-plan.md § AC-018-b
import { test, expect } from "@playwright/test";
import { signIn, getAccessToken } from "../lib/auth";
import { createDepartment } from "../lib/seed";

test("AC-018-b: an Admin can configure a separate intake mailbox for an individual department", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "admin");
  const token = await getAccessToken(page);
  const dept = await createDepartment(request, token, `E2E Mailbox Dept ${Date.now()}`);
  const mailbox = "intake@example.gov";

  // 1. Open the department and set its intake mailbox
  await page.goto("/departments");
  await page.getByRole("row", { name: dept.name }).click();
  await page.getByRole("textbox", { name: /Intake mailbox/ }).fill(mailbox);
  await page.getByRole("button", { name: "Save" }).click();

  // Assert: the departments table shows the configured mailbox for this department.
  await expect(page.getByRole("row", { name: new RegExp(`${dept.name}.*${mailbox}`) })).toBeVisible();
});

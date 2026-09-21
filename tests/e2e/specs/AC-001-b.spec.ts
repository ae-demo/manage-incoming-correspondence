// spec: tests/validation/test-plan.md § AC-001-b
import { test, expect } from "@playwright/test";
import { signIn } from "../lib/auth";

test("AC-001-b: a logged physical item appears in the system immediately after being saved", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "registryOfficer");
  // 1. Log a physical item
  await page.goto("/log");
  const sender = `E2E Sender ${Date.now()}`;
  await page.getByRole("textbox", { name: "Sender name" }).fill(sender);
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Complaint" }).click();
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose file" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "scan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("scanned copy"),
  });
  await page.getByRole("button", { name: "Save" }).click();
  // 2. Go straight to the inbox
  await page.goto("/inbox");
  // Assert: the newly logged item is visible immediately.
  await expect(page.getByRole("cell", { name: sender })).toBeVisible();
});

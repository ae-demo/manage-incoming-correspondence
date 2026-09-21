// spec: tests/validation/test-plan.md § AC-001-a
import { test, expect } from "@playwright/test";
import { signIn } from "../lib/auth";

test("AC-001-a: Registry Officer creates a correspondence item with sender, category, and a scanned attachment", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page, "registryOfficer");
  // 1. Navigate to Log Physical Item
  await page.goto("/log");
  // 2. Fill sender name, category, and choose a scanned file
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
  // 3. Save
  await page.getByRole("button", { name: "Save" }).click();
  // Assert: the item is created and the officer is returned to the inbox.
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByRole("cell", { name: sender })).toBeVisible();
});

// spec: tests/validation/test-plan.md § AC-012-d
import { test, expect } from "@playwright/test";
import { signIn } from "../lib/auth";

test("AC-012-d: Registry Officer can filter correspondence by date", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "registryOfficer");
  // Every item is received "today" (the server sets receivedDate on creation),
  // so a date with no matches is reliably any prior day.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // 1. Open Search and filter by a date with no received items
  await page.goto("/search");
  await page.getByRole("textbox", { name: "Date" }).fill(yesterday);

  // Assert: no matches for that date.
  await expect(page.getByText("No matches")).toBeVisible();
});

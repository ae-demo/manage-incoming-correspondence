// spec: tests/validation/test-plan.md § AC-012-d
import { test, expect } from "@playwright/test";
import { signIn } from "../lib/auth";

test("AC-012-d: Registry Officer can filter correspondence by date", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "registryOfficer");
  // Repeat validation runs accumulate correspondence across many calendar
  // days, so "yesterday" is no longer reliably empty — a date well before
  // any test data could exist is the only safe choice.
  const noMatchDate = "2000-01-01";

  // 1. Open Search and filter by a date with no received items
  await page.goto("/search");
  await page.getByRole("textbox", { name: "Date" }).fill(noMatchDate);

  // Assert: no matches for that date.
  await expect(page.getByText("No matches")).toBeVisible();
});

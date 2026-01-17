import { expect, test } from "@playwright/test";

test("marketing home renders hero panel", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-hero-text-panel]")).toBeVisible();
});

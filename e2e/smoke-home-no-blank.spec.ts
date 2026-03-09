import { expect, test } from "@playwright/test";

test("home smoke: no blank screen and no runtime errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message ?? String(error));
  });

  await page.goto("/");
  await expect(page.locator("[data-hero-text-panel]")).toBeVisible();

  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(20);

  if (consoleErrors.length || pageErrors.length) {
    throw new Error(
      `Runtime errors detected. console=${consoleErrors.join(" | ")} page=${pageErrors.join(" | ")}`,
    );
  }
});

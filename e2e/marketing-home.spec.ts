import { expect, test } from "@playwright/test";

test("marketing home renders hero panel", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }
    const text = message.text();
    if (/TypeError|ReferenceError|Content Security Policy|CSP|hydration/i.test(text)) {
      consoleErrors.push(text);
    }
  });

  page.on("pageerror", (error) => {
    const text = error.message ?? String(error);
    if (/TypeError|ReferenceError|Content Security Policy|CSP|hydration/i.test(text)) {
      pageErrors.push(text);
    }
  });

  await page.goto("/");
  await expect(page.locator("[data-hero-text-panel]")).toBeVisible();

  const heroReviewWidget = page.getByTestId("hero-review-widget");
  await expect(heroReviewWidget).toBeVisible();
  await expect(heroReviewWidget).toContainText(/Google Maps|Paciente de DentPro|Ortodoncia/i);

  if (consoleErrors.length || pageErrors.length) {
    throw new Error(
      `Errores detectados en consola: ${[...consoleErrors, ...pageErrors].join(" | ")}`,
    );
  }
});

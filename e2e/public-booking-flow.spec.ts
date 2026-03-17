import { expect, test } from "@playwright/test";

import { E2E_ROUTES, E2E_TEST_IDS } from "./utils/constants";

test("home exposes critical CTAs and availability block", async ({ page }) => {
  const runtimeErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    runtimeErrors.push(error.message ?? String(error));
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: "Ver disponibilidad" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reservar turno" })).toBeVisible();
  await expect(page.getByTestId(E2E_TEST_IDS.availabilityBlock)).toBeVisible();

  if (runtimeErrors.length > 0) {
    throw new Error(`Errores críticos detectados en home: ${runtimeErrors.join(" | ")}`);
  }
});

test("@smoke booking route redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/appointments/new", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=%2Fappointments%2Fnew/);
  await expect(page).toHaveURL(new RegExp(E2E_ROUTES.login.replace("/", "\\/")));
  await expect(page.getByRole("heading", { name: "Inicia sesión en DentPro" })).toBeVisible();
});

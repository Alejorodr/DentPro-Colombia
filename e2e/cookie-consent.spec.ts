import { expect, test } from "@playwright/test";

// Visitante nuevo: sin la decisión precargada en playwright.config.ts.
test.use({ storageState: { cookies: [], origins: [] } });

test("aviso de cookies: rechazar no carga el mapa y aceptar sí (DOG-36)", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const banner = page.getByRole("region", { name: "Tu privacidad" });
  await expect(banner).toBeVisible();

  const mapFrame = page.locator('iframe[title="Ubicación DentPro Colombia"]');

  await banner.getByRole("button", { name: "Solo esenciales" }).click();
  await expect(banner).toBeHidden();
  await expect(page.getByRole("button", { name: "Cargar mapa" })).toBeVisible();
  await expect(mapFrame).toHaveCount(0);

  // El enlace del footer reabre las preferencias y permite cambiar la decisión.
  await page.getByRole("button", { name: "Gestionar cookies" }).click();
  const dialog = page.getByRole("dialog", { name: "Preferencias de cookies" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("switch", { name: "Servicios de terceros" }).check();
  await dialog.getByRole("button", { name: "Guardar preferencias" }).click();
  await expect(dialog).toBeHidden();
  await expect(mapFrame).toHaveCount(1);

  // La decisión persiste entre visitas.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Tu privacidad" })).toBeHidden();
});

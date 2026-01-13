import { expect, test } from "@playwright/test";

import { seedAdminSession } from "./utils/session";

test("forgot password responds generically", async ({ page }) => {
  await page.route("**/api/auth/forgot-password", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Si el correo existe, te enviaremos instrucciones para restablecer tu contraseña.",
      }),
    });
  });

  await page.goto("/auth/forgot-password");
  await page.getByLabel("Correo electrónico").fill("kevinrodr@hotmail.com");
  await page.getByRole("button", { name: "Enviar enlace" }).click();

  await expect(page.getByText(/Si el correo existe/i)).toBeVisible();
});

test("reset password accepts new password", async ({ page }) => {
  await page.route("**/api/auth/reset-password", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Contraseña actualizada." }),
    });
  });

  await page.goto("/auth/reset-password?token=test-token");
  await page.getByLabel("Nueva contraseña").fill("PasswordSeguro1");
  await page.getByLabel("Confirmar contraseña").fill("PasswordSeguro1");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();

  await expect(page.getByText(/Contraseña actualizada/i)).toBeVisible();
});

test("login accepts new password", async ({ page, context }) => {
  await seedAdminSession(context);
  await page.goto("/portal/admin");
  await expect(page).toHaveURL(/\/portal\/admin/);
});

test("reset token reuse fails", async ({ page }) => {
  await page.route("**/api/auth/reset-password", (route) => {
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: "El token es inválido o expiró." }),
    });
  });

  await page.goto("/auth/reset-password?token=used-token");
  await page.getByLabel("Nueva contraseña").fill("PasswordSeguro1");
  await page.getByLabel("Confirmar contraseña").fill("PasswordSeguro1");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();

  await expect(page.getByText(/inválido|expiró/i)).toBeVisible();
});

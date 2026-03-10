import { expect, test } from "@playwright/test";

import { seedRoleSession } from "./utils/session";

test("login page renders and shows credential error", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  await page.locator("#login-email").fill("admin@dentpro.test");
  await page.locator("#login-password").fill("incorrecta");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByText("No se pudo iniciar sesión")).toBeVisible();
});

test("paciente navega dashboard y citas", async ({ page, context }) => {
  await seedRoleSession(context, "PACIENTE");

  await page.goto("/portal/client");
  await expect(page.getByTestId("client-dashboard-page")).toBeVisible();

  await page.goto("/portal/client/appointments");
  await expect(page).toHaveURL(/\/portal\/client\/appointments/);
  await expect(page.getByText(/Gestiona tus citas|perfil de paciente/i)).toBeVisible();
});

test("recepcionista abre agenda y visualiza turnos", async ({ page, context }) => {
  await seedRoleSession(context, "RECEPCIONISTA");

  await page.goto("/portal/receptionist/schedule");
  await expect(page.getByTestId("receptionist-schedule-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agenda del día" })).toBeVisible();
});

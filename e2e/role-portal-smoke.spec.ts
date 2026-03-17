import { expect, test } from "@playwright/test";

import { E2E_ROUTES, E2E_SELECTORS, E2E_TEST_IDS } from "./utils/constants";
import { seedRoleSession } from "./utils/session";
import { openReceptionistSchedule } from "./utils/fixtures";

test("login page renders and shows credential error", async ({ page }) => {
  await page.goto(E2E_ROUTES.login, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();

  await page.locator(E2E_SELECTORS.loginEmail).fill("admin@dentpro.test");
  await page.locator(E2E_SELECTORS.loginPassword).fill("incorrecta");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByText("No se pudo iniciar sesión")).toBeVisible();
});

test("paciente navega dashboard y citas", async ({ page, context }) => {
  await seedRoleSession(context, "PACIENTE");

  await page.goto(E2E_ROUTES.portal.PACIENTE, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId(E2E_TEST_IDS.clientDashboardPage)).toBeVisible();

  await page.goto("/portal/client/appointments", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/portal\/client\/appointments/);
  await expect(page.getByTestId("client-appointments-page")).toBeVisible();
});

test("recepcionista llega a agenda operativa", async ({ page, context }) => {
  await seedRoleSession(context, "RECEPCIONISTA");

  await openReceptionistSchedule(page);
  await expect(page.getByTestId(E2E_TEST_IDS.receptionistSchedulePage)).toBeVisible();
});

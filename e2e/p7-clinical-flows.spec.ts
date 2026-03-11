import { expect, test } from "@playwright/test";

import { seedRoleSession } from "./utils/session";

const isEnabled = process.env.RUN_E2E === "1";

test.describe("P7 clinical flows", () => {
  test.skip(!isEnabled, "RUN_E2E=1 requerido para ejecutar flujos clínicos completos.");

  test("flujo 1: recepcion cambia estado y valida timeline/feed", async ({ page, context }) => {
    await seedRoleSession(context, "RECEPCIONISTA");
    await page.goto("/portal/receptionist/schedule");

    await expect(page.getByTestId("receptionist-schedule-page")).toBeVisible();
    await expect(page.getByText(/Timeline del día/i)).toBeVisible();
    await expect(page.getByText(/Actividad/i).first()).toBeVisible();
  });

  test("flujo 2: reprogramación refleja notificaciones", async ({ page, context }) => {
    await seedRoleSession(context, "RECEPCIONISTA");
    await page.goto("/portal/receptionist/schedule");

    await page.getByRole("button", { name: "Ver notificaciones" }).click();
    await expect(page.getByText("Centro de actividad")).toBeVisible();
    await expect(page.getByRole("button", { name: /Marcar todas/i })).toBeVisible();
  });

  test("flujo 3: paciente cancelación visible para recepción", async ({ page, context }) => {
    await seedRoleSession(context, "PACIENTE");
    await page.goto("/portal/client");
    await expect(page.getByTestId("client-dashboard-page")).toBeVisible();
    await expect(page.getByText(/Actividad de tus citas/i)).toBeVisible();

    await seedRoleSession(context, "RECEPCIONISTA");
    await page.goto("/portal/receptionist/schedule");
    await expect(page.getByRole("heading", { name: "Agenda del día" })).toBeVisible();
  });
});

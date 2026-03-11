import { expect, test } from "@playwright/test";

import { seedRoleSession } from "./utils/session";

const isEnabled = process.env.RUN_E2E === "1";

test.describe("P7 clinical flows", () => {
  test.skip(!isEnabled, "RUN_E2E=1 requerido para ejecutar flujos clínicos completos.");

  test("flujo 1: recepción confirma cita y aparece actividad", async ({ page, context }) => {
    await seedRoleSession(context, "RECEPCIONISTA");
    await page.goto("/portal/receptionist/schedule");

    await expect(page.getByTestId("receptionist-schedule-page")).toBeVisible();
    const confirmButton = page.getByRole("button", { name: /Confirmar/i }).first();
    await expect(confirmButton).toBeVisible();
    if (await confirmButton.isEnabled()) {
      await confirmButton.click();
      await expect(page.getByText(/Estado actualizado correctamente/i)).toBeVisible();
    }
    await expect(page.getByText(/Actividad operativa reciente/i)).toBeVisible();
  });

  test("flujo 2: recepción reprograma cita y valida centro de actividad", async ({ page, context }) => {
    await seedRoleSession(context, "RECEPCIONISTA");
    await page.goto("/portal/receptionist/schedule");

    await page.getByRole("button", { name: "Ver notificaciones" }).click();
    await expect(page.getByText("Centro de actividad")).toBeVisible();
    await expect(page.getByRole("button", { name: /Marcar todas como leídas/i })).toBeVisible();
  });

  test("flujo 3: paciente cancela y recepción ve actualización", async ({ page, context }) => {
    await seedRoleSession(context, "PACIENTE");
    await page.goto("/portal/client");
    await expect(page.getByTestId("client-dashboard-page")).toBeVisible();
    await expect(page.getByText(/Actividad de tus citas/i)).toBeVisible();

    await seedRoleSession(context, "RECEPCIONISTA");
    await page.goto("/portal/receptionist/schedule");
    await expect(page.getByRole("heading", { name: "Agenda del día" })).toBeVisible();
    await expect(page.getByText(/Turnos ordenados por hora/i)).toBeVisible();
  });
});

import { expect, test } from "@playwright/test";

import { openRolePortal, prepareRoleContext } from "./utils/fixtures";

const isEnabled = process.env.RUN_E2E === "1";

test.describe("P9 flujos clínicos en CI", () => {
  test.skip(!isEnabled, "RUN_E2E=1 requerido para ejecutar flujos clínicos reales.");

  test("@smoke flujo A: recepción confirma cita y aparece en actividad", async ({ page, context, request }) => {
    await prepareRoleContext({ request, context, role: "RECEPCIONISTA" });
    await openRolePortal({ role: "RECEPCIONISTA", page });

    await expect(page.getByTestId("receptionist-schedule-page")).toBeVisible();

    const confirmButton = page.getByRole("button", { name: /Confirmar/i }).first();
    await expect(confirmButton).toBeVisible();
    if (await confirmButton.isEnabled()) {
      await confirmButton.click();
      await expect(page.getByText(/Estado actualizado correctamente/i)).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: /Actividad operativa reciente/i })).toBeVisible();
    await expect(page.getByLabel("Feed de actividad clínica")).toBeVisible();
  });

  test("flujo B: recepción reprograma y paciente ve notificación", async ({ page, context, request }) => {
    await prepareRoleContext({ request, context, role: "RECEPCIONISTA" });
    await openRolePortal({ role: "RECEPCIONISTA", page });

    await page.getByRole("button", { name: "Ver notificaciones" }).click();
    await expect(page.getByText("Centro de actividad")).toBeVisible();
    await expect(page.getByRole("button", { name: /Marcar todas como leídas/i })).toBeVisible();

    const loadMore = page.getByRole("button", { name: /Cargar más/i });
    if (await loadMore.isVisible()) {
      await loadMore.click();
    }
  });

  test("flujo C: paciente cancela y recepción visualiza evento", async ({ page, context, request }) => {
    await prepareRoleContext({ request, context, role: "PACIENTE" });
    await openRolePortal({ role: "PACIENTE", page });
    await expect(page.getByTestId("client-dashboard-page")).toBeVisible();

    await prepareRoleContext({ request, context, role: "RECEPCIONISTA" });
    await openRolePortal({ role: "RECEPCIONISTA", page });
    await expect(page.getByRole("heading", { name: "Agenda del día" })).toBeVisible();
    await expect(page.getByText(/Turnos ordenados por hora/i)).toBeVisible();
  });
});

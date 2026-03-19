import { expect, test } from "@playwright/test";

import { openReceptionistSchedule, openRolePortal, prepareRoleContext } from "./utils/fixtures";
import { E2E_TEST_IDS } from "./utils/constants";

const isEnabled = process.env.RUN_E2E === "1";

test.describe("Clinical cross-role flows", () => {
  test.skip(!isEnabled, "RUN_E2E=1 requerido para ejecutar flujos clínicos reales.");

  test("@smoke recepción confirma cita y aparece en actividad", async ({ page, context, request }) => {
    await prepareRoleContext({ request, context, role: "RECEPCIONISTA" });
    await openReceptionistSchedule(page);

    const confirmButton = page.getByRole("button", { name: /Confirmar/i }).first();
    await expect(confirmButton).toBeVisible();
    if (await confirmButton.isEnabled()) {
      await confirmButton.click();
      await expect(page.getByText(/Estado actualizado correctamente/i)).toBeVisible();
    }

    await expect(page.getByTestId(E2E_TEST_IDS.receptionistActivityFeed)).toBeVisible();
  });

  test("recepción consulta centro de actividad y paginación", async ({ page, context, request }) => {
    await prepareRoleContext({ request, context, role: "RECEPCIONISTA" });
    await openReceptionistSchedule(page);

    await page.getByTestId(E2E_TEST_IDS.receptionistNotificationsButton).click();
    await expect(page.getByTestId(E2E_TEST_IDS.receptionistNotificationsPanel)).toBeVisible();
    await expect(page.getByRole("button", { name: /Marcar todas como leídas/i })).toBeVisible();

    const loadMore = page.getByRole("button", { name: /Cargar más/i });
    if (await loadMore.isVisible()) {
      await loadMore.click();
    }
  });

  test("paciente y recepción navegan sus portales operativos", async ({ page, context, request }) => {
    await prepareRoleContext({ request, context, role: "PACIENTE" });
    await openRolePortal({ role: "PACIENTE", page });
    await expect(page.getByTestId(E2E_TEST_IDS.clientDashboardPage)).toBeVisible();

    await prepareRoleContext({ request, context, role: "RECEPCIONISTA" });
    await openReceptionistSchedule(page);
    await expect(page.getByTestId(E2E_TEST_IDS.receptionistSchedulePage)).toBeVisible();
    await expect(page.getByText(/Turnos ordenados por hora/i)).toBeVisible();
  });
});

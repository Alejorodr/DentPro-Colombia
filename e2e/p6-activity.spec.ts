import { expect, test } from "@playwright/test";

import { seedRoleSession } from "./utils/session";

test("@smoke recepcionista abre centro de actividad desde agenda", async ({ page, context }) => {
  await seedRoleSession(context, "RECEPCIONISTA");

  await page.goto("/portal/receptionist/schedule", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("receptionist-schedule-page")).toBeVisible();

  await page.getByRole("button", { name: "Ver notificaciones" }).click();
  await expect(page.getByText("Centro de actividad")).toBeVisible();
});

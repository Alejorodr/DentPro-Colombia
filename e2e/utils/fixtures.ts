import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

import { seedTestData } from "./seed";
import { seedRoleSession } from "./session";

export type PortalRole = "RECEPCIONISTA" | "PACIENTE" | "PROFESIONAL" | "ADMINISTRADOR";

export async function prepareRoleContext(params: {
  request: APIRequestContext;
  context: BrowserContext;
  role: PortalRole;
}) {
  await seedTestData(params.request);
  await seedRoleSession(params.context, params.role);
}

export async function openRolePortal(params: {
  role: PortalRole;
  page: Page;
}) {
  const rolePath =
    params.role === "PACIENTE"
      ? "/portal/client"
      : params.role === "PROFESIONAL"
        ? "/portal/professional"
        : params.role === "ADMINISTRADOR"
          ? "/portal/admin"
          : "/portal/receptionist";

  await params.page.goto(rolePath, { waitUntil: "domcontentloaded" });
  await expect(params.page).toHaveURL(new RegExp("/portal/"));
}

export async function openReceptionistSchedule(page: Page) {
  await page.goto("/portal/receptionist", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/portal\/receptionist\/(dashboard|schedule)/);

  if (!page.url().includes("/portal/receptionist/schedule")) {
    await page.goto("/portal/receptionist/schedule", { waitUntil: "domcontentloaded" });
  }

  await expect(page).toHaveURL(/\/portal\/receptionist\/schedule/);
  await expect(page.getByTestId("receptionist-schedule-page")).toBeVisible();
}

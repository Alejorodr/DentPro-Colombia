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
          : "/portal/receptionist/schedule";

  await params.page.goto(rolePath);
  await expect(params.page).toHaveURL(new RegExp("/portal/"));
}

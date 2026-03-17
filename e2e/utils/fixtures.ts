import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

import { seedTestData } from "./seed";
import { seedRoleSession } from "./session";
import { E2E_ROUTES, E2E_TEST_IDS, type E2EPortalRole } from "./constants";

export type PortalRole = E2EPortalRole;

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
  const rolePath = E2E_ROUTES.portal[params.role];

  await params.page.goto(rolePath, { waitUntil: "domcontentloaded" });
  await expect(params.page).toHaveURL(new RegExp("/portal/"));
}

export async function openReceptionistSchedule(page: Page) {
  await page.goto(E2E_ROUTES.portal.RECEPCIONISTA, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/portal\/receptionist\/dashboard/);

  await page.goto(E2E_ROUTES.receptionist.schedule, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/portal\/receptionist\/schedule/);
  await expect(page.getByTestId(E2E_TEST_IDS.receptionistSchedulePage)).toBeVisible();
}

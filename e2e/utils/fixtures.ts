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
  const seededUsers = await seedTestData(params.request);
  await seedRoleSession(params.context, params.role, seededUsers);
}

export async function openRolePortal(params: {
  role: PortalRole;
  page: Page;
}) {
  const rolePath = E2E_ROUTES.portal[params.role];

  await params.page.goto(rolePath, { waitUntil: "domcontentloaded" });

  if (params.role === "RECEPCIONISTA") {
    await expect(params.page).toHaveURL(/\/portal\/receptionist(\/dashboard)?$/);
    return;
  }

  await expect(params.page).toHaveURL(new RegExp(`^.*${rolePath}`));
}

export async function openReceptionistDashboard(page: Page) {
  const receptionistPortalPath = /^\/portal\/receptionist(?:\/.*)?$/;
  const isInReceptionistPortal = () => receptionistPortalPath.test(new URL(page.url()).pathname);
  const isOnDashboard = () => new URL(page.url()).pathname === E2E_ROUTES.receptionist.dashboard;

  if (!isInReceptionistPortal()) {
    await page.goto(E2E_ROUTES.portal.RECEPCIONISTA, { waitUntil: "domcontentloaded" });
  }

  await page
    .waitForURL((url) => receptionistPortalPath.test(url.pathname), {
      timeout: 5_000,
      waitUntil: "domcontentloaded",
    })
    .catch(() => undefined);

  if (!isInReceptionistPortal()) {
    await page.goto(E2E_ROUTES.portal.RECEPCIONISTA, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/portal\/receptionist(?:\/.*)?$/);
  }

  if (!isOnDashboard()) {
    await page.goto(E2E_ROUTES.receptionist.dashboard, { waitUntil: "domcontentloaded" });
  }

  await expect(page).toHaveURL(/\/portal\/receptionist\/dashboard(?:\?.*)?$/);
}

export async function openReceptionistSchedule(page: Page) {
  await openReceptionistDashboard(page);
  await page.goto(E2E_ROUTES.receptionist.schedule, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/portal\/receptionist\/schedule/);
  await expect(page.getByTestId(E2E_TEST_IDS.receptionistSchedulePage)).toBeVisible();
}

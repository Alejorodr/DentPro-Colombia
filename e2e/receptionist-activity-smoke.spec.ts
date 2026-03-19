import { expect, test } from "@playwright/test";

import { openReceptionistSchedule } from "./utils/fixtures";
import { seedRoleSession } from "./utils/session";
import { seedTestData } from "./utils/seed";
import { E2E_TEST_IDS } from "./utils/constants";

test("@smoke recepcionista abre centro de actividad desde agenda", async ({ page, context, request }) => {
  const seededUsers = await seedTestData(request);
  await seedRoleSession(context, "RECEPCIONISTA", seededUsers);

  await openReceptionistSchedule(page);

  await page.getByTestId(E2E_TEST_IDS.receptionistNotificationsButton).click();
  await expect(page.getByTestId(E2E_TEST_IDS.receptionistNotificationsPanel)).toBeVisible();
});

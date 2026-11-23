import { test } from "@playwright/test";

import { openNotificationsPanel, openReceptionistSchedule } from "./utils/fixtures";
import { seedRoleSession } from "./utils/session";
import { seedTestData } from "./utils/seed";

test("@smoke recepcionista abre centro de actividad desde agenda", async ({ page, context, request }) => {
  const seededUsers = await seedTestData(request);
  await seedRoleSession(context, "RECEPCIONISTA", seededUsers);

  await openReceptionistSchedule(page);

  await openNotificationsPanel(page);
});

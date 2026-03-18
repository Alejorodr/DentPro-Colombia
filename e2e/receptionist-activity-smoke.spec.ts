import { expect, test } from "@playwright/test";

import { openReceptionistSchedule } from "./utils/fixtures";
import { seedRoleSession } from "./utils/session";
import { seedTestData } from "./utils/seed";

test("@smoke recepcionista abre centro de actividad desde agenda", async ({ page, context, request }) => {
  const seededUsers = await seedTestData(request);
  await seedRoleSession(context, "RECEPCIONISTA", seededUsers);

  await openReceptionistSchedule(page);

  await page.getByRole("button", { name: "Ver notificaciones" }).click();
  await expect(page.getByRole("heading", { name: "Centro de actividad" })).toBeVisible();
});

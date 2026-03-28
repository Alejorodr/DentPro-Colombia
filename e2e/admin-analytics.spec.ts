import { test, expect } from "@playwright/test";

import { seedAdminSession } from "./utils/session";
import { seedTestData } from "./utils/seed";

test.describe("Admin analytics dashboard", () => {
  test.beforeEach(async ({ request }) => {
    await seedTestData(request);
  });

  test("renders real KPIs and updates by range", async ({ page, context, request }) => {
    const seededUsers = await seedTestData(request);
    await seedAdminSession(context, seededUsers);

    await page.goto("/portal/admin");

    await expect(page.getByTestId("admin-dashboard-title")).toBeVisible();

    await expect(page.getByTestId("admin-kpi-appointments")).toContainText("Appointments Today");
    await expect(page.getByTestId("admin-kpi-appointments")).toContainText(/^\D*\d+/m);
    await expect(page.getByTestId("admin-kpi-revenue")).toContainText("Revenue MTD");
    await expect(page.getByTestId("admin-kpi-revenue")).toContainText(/COP|\$/);
    await expect(page.getByTestId("admin-kpi-active-staff")).toContainText("Active Staff");
    await expect(page.getByTestId("admin-kpi-active-staff")).toContainText(/^\D*\d+/m);
    await expect(page.getByTestId("admin-kpi-pending-approvals")).toContainText("Pending Approvals");
    await expect(page.getByTestId("admin-kpi-pending-approvals")).toContainText(/^\D*\d+/m);

    const rangeSelector = page.getByRole("combobox").first();
    await rangeSelector.selectOption("last7");

    await expect(page).toHaveURL(/range=last7/);

    await expect(page.getByRole("table")).toBeVisible();
  });
});

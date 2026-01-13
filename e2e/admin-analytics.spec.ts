import { test, expect } from "@playwright/test";

import { seedAdminSession } from "./utils/session";

test.describe("Admin analytics dashboard", () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.post("/api/ops/seed-admin", {
      headers: { "x-ops-key": process.env.OPS_KEY ?? "ops-test-key" },
    });
    expect(response.ok()).toBeTruthy();
  });

  test("renders real KPIs and updates by range", async ({ page, context }) => {
    await seedAdminSession(context);

    await page.goto("/portal/admin");

    await expect(page.getByText("Citas en período")).toBeVisible();
    await expect(page.getByText("Pacientes nuevos")).toBeVisible();
    await expect(page.getByText("Profesionales activos")).toBeVisible();
    await expect(page.getByText("Ocupación agenda")).toBeVisible();

    const statValues = page.locator("section").nth(1).getByText(/\d+%?/, { exact: false });
    await expect(statValues.first()).toBeVisible();

    const rangeSelector = page.getByRole("combobox").first();
    await rangeSelector.selectOption("last7");

    await expect(page.getByText("Últimos 7 días")).toBeVisible();

    await expect(page.getByRole("table")).toBeVisible();
  });
});

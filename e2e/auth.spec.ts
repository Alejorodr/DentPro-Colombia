import { test, expect } from "@playwright/test";

import { seedAdminSession } from "./utils/session";
import { seedTestData } from "./utils/seed";
import { E2E_ROUTES, E2E_SELECTORS, E2E_TEST_IDS } from "./utils/constants";

const authUser = {
  email: process.env.TEST_AUTH_EMAIL ?? "admin@dentpro.test",
  password: process.env.TEST_AUTH_PASSWORD ?? "Test1234!",
};

test("@smoke seed admin then login redirects to admin dashboard", async ({ page, request }) => {
  const seedEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@dentpro.test";
  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "Test1234!";
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  test.skip(!hasDatabase, "DATABASE_URL is required for seed admin test.");

  await seedTestData(request);

  await page.goto(E2E_ROUTES.login, { waitUntil: "domcontentloaded" });
  await page.locator(E2E_SELECTORS.loginEmail).fill(seedEmail);
  await page.locator(E2E_SELECTORS.loginPassword).fill(seedPassword);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByTestId(E2E_TEST_IDS.adminDashboardTitle)).toBeVisible();
});

test("login succeeds and persists across refresh", async ({ page, context }) => {
  await seedAdminSession(context);
  await page.goto(E2E_ROUTES.portal.ADMINISTRADOR, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByTestId(E2E_TEST_IDS.adminDashboardTitle)).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByTestId(E2E_TEST_IDS.adminDashboardTitle)).toBeVisible();
});

test("login with bypass credentials returns session", async ({ page }) => {
  const bypassEnabled = process.env.TEST_AUTH_BYPASS === "1";
  test.skip(!bypassEnabled, "TEST_AUTH_BYPASS is required for bypass login test.");

  await page.goto(E2E_ROUTES.login, { waitUntil: "domcontentloaded" });
  await page.locator(E2E_SELECTORS.loginEmail).fill(authUser.email);
  await page.locator(E2E_SELECTORS.loginPassword).fill(authUser.password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/portal\/admin/);

  const sessionResponse = await page.request.get("/api/auth/session");
  expect(sessionResponse.ok()).toBeTruthy();
  const sessionData = await sessionResponse.json();
  expect(sessionData?.user?.email).toBeTruthy();
});

test("rejects invalid credentials and protects portal routes", async ({ page }) => {
  await page.goto(E2E_ROUTES.login, { waitUntil: "domcontentloaded" });

  await page.locator(E2E_SELECTORS.loginEmail).fill(authUser.email);
  await page.locator(E2E_SELECTORS.loginPassword).fill("wrong-password");
  await expect(page.locator(E2E_SELECTORS.loginEmail)).toHaveValue(authUser.email);
  await expect(page.locator(E2E_SELECTORS.loginPassword)).toHaveValue("wrong-password");
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByText("No se pudo iniciar sesión")).toBeVisible();

  await page.goto(E2E_ROUTES.portal.ADMINISTRADOR, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=%2Fportal%2Fadmin/);
});

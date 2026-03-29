import { test, expect, type Page } from "@playwright/test";

import { seedAdminSession } from "./utils/session";
import { seedTestData } from "./utils/seed";
import { E2E_ROUTES, E2E_SELECTORS, E2E_TEST_IDS } from "./utils/constants";

const authUser = {
  email: process.env.TEST_AUTH_EMAIL ?? "admin@dentpro.test",
  password: process.env.TEST_AUTH_PASSWORD ?? "Test1234!",
};

async function submitLogin(page: Page, params: { email: string; password: string }) {
  await page.goto(E2E_ROUTES.login, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("login-form-ready")).toBeVisible({ timeout: 10_000 });
  const emailInput = page.locator(E2E_SELECTORS.loginEmail);
  const passwordInput = page.locator(E2E_SELECTORS.loginPassword);
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  await emailInput.fill(params.email);
  await passwordInput.fill(params.password);
  await expect(emailInput).toHaveValue(params.email);
  await expect(passwordInput).toHaveValue(params.password);

  const submitButton = page.locator(E2E_SELECTORS.loginSubmit);
  await expect(submitButton).toBeEnabled({ timeout: 10_000 });
  const callbackResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/callback/credentials"),
  );

  await Promise.all([callbackResponsePromise, submitButton.click()]);

  const callbackResponse = await callbackResponsePromise;
  expect(callbackResponse.ok()).toBeTruthy();
}

test("@smoke seed admin then login redirects to admin dashboard", async ({ page, request }) => {
  const seedEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@dentpro.test";
  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "Test1234!";
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  test.skip(!hasDatabase, "DATABASE_URL is required for seed admin test.");

  await seedTestData(request);
  await submitLogin(page, { email: seedEmail, password: seedPassword });

  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByTestId(E2E_TEST_IDS.adminDashboardTitle)).toBeVisible();
});

test("login succeeds and persists across refresh", async ({ page, context, request }) => {
  const seededUsers = await seedTestData(request);
  await seedAdminSession(context, seededUsers);
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

  await submitLogin(page, { email: authUser.email, password: authUser.password });

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
  const submitButton = page.locator(E2E_SELECTORS.loginSubmit);
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByText("No se pudo iniciar sesión")).toBeVisible();

  await page.goto(E2E_ROUTES.portal.ADMINISTRADOR, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=%2Fportal%2Fadmin/);
});

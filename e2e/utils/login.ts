import { expect, type Locator, type Page } from "@playwright/test";

import { E2E_ROUTES, E2E_SELECTORS } from "./constants";

export interface LoginCredentials {
  email: string;
  password: string;
}

async function getLoginFormLocators(page: Page): Promise<{
  emailInput: Locator;
  passwordInput: Locator;
  submitButton: Locator;
}> {
  await expect(page.getByTestId("login-form-ready")).toBeVisible({
    timeout: 10_000,
  });

  const emailInput = page.locator(E2E_SELECTORS.loginEmail);
  const passwordInput = page.locator(E2E_SELECTORS.loginPassword);
  const submitButton = page.locator(E2E_SELECTORS.loginSubmit);

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();

  return { emailInput, passwordInput, submitButton };
}

export async function fillLoginForm(page: Page, credentials: LoginCredentials) {
  const { emailInput, passwordInput, submitButton } =
    await getLoginFormLocators(page);

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);

  await expect(emailInput).toHaveValue(credentials.email);
  await expect(passwordInput).toHaveValue(credentials.password);
  await expect(submitButton).toBeEnabled({ timeout: 10_000 });

  return { submitButton };
}

export async function loginFromPortal(
  page: Page,
  credentials: LoginCredentials,
) {
  await page.goto(E2E_ROUTES.login, { waitUntil: "domcontentloaded" });
  return fillLoginForm(page, credentials);
}

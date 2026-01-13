import { test, expect } from "@playwright/test";

import { seedAdminSession } from "./utils/session";

const authUser = {
  email: process.env.TEST_AUTH_EMAIL ?? "admin@dentpro.test",
  password: process.env.TEST_AUTH_PASSWORD ?? "Test1234!",
};

test("login succeeds and persists across refresh", async ({ page, context }) => {
  await seedAdminSession(context);
  await page.goto("/portal/admin");
  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByText("Portal Administrador")).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/portal\/admin/);
  await expect(page.getByText("Portal Administrador")).toBeVisible();
});

test("rejects invalid credentials and protects portal routes", async ({ page }) => {
  await page.goto("/auth/login");

  await page.locator("#login-email").fill(authUser.email);
  await page.locator("#login-password").fill("wrong-password");
  await expect(page.locator("#login-email")).toHaveValue(authUser.email);
  await expect(page.locator("#login-password")).toHaveValue("wrong-password");
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeEnabled();
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/auth\/login/);
  await expect(page.getByText("No se pudo iniciar sesión")).toBeVisible();

  await page.goto("/portal/admin");
  await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=%2Fportal%2Fadmin/);
});

import { test, expect } from "@playwright/test";

import { generateTotp, totpStep } from "@/lib/auth/totp";

import { loginFromPortal } from "./utils/login";
import { seedAdminSession } from "./utils/session";
import { seedTestData } from "./utils/seed";

/**
 * DOG-28: verificación en dos pasos para administradores y profesionales. Un profesional recién
 * creado se inscribe con la app autenticadora, vuelve a entrar con un código de respaldo y el
 * administrador le restablece el MFA.
 */
test.describe("verificación en dos pasos", () => {
  test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for MFA test.");

  test("un profesional se inscribe, entra con un código de respaldo y el admin lo restablece", async ({
    browser,
    context,
    request,
  }) => {
    const seededUsers = await seedTestData(request);
    await seedAdminSession(context, seededUsers);
    const admin = context.request;

    const specialties = (await (await admin.get("/api/specialties")).json()) as Array<{ id: string }>;
    const email = `mfa-${Date.now()}@dentpro.test`;
    const password = "MfaPrueba!2026";
    const created = await admin.post("/api/users", {
      data: { email, password, name: "Paula", lastName: "Prueba", role: "PROFESIONAL", specialtyId: specialties[0].id },
    });
    expect(created.status()).toBe(201);
    const { id: userId } = (await created.json()) as { id: string };

    // 1. Primer acceso: con la contraseña sola no entra al portal, tiene que inscribirse.
    const proContext = await browser.newContext();
    const page = await proContext.newPage();
    const { submitButton } = await loginFromPortal(page, { email, password });
    await submitButton.click();
    await expect(page).toHaveURL(/\/auth\/mfa/);
    await expect(page.getByRole("heading", { name: "Activa la verificación en dos pasos" })).toBeVisible();

    // Mientras tanto, la API clínica la rechaza.
    expect((await page.request.get("/api/professional/dashboard")).status()).toBe(401);

    await page.getByText("¿No puedes escanearlo? Escribe la clave").click();
    const secret = ((await page.getByTestId("mfa-secret").textContent()) ?? "").replace(/\s/g, "");
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);

    await page.getByLabel("Código de verificación").fill(generateTotp(secret, totpStep(Date.now())));
    await page.getByRole("button", { name: "Activar" }).click();

    const codes = page.getByTestId("mfa-backup-codes").locator("li");
    await expect(codes).toHaveCount(10);
    const backupCode = (await codes.first().textContent()) ?? "";

    await page.getByLabel("Ya guardé mis códigos de respaldo").check();
    await page.getByRole("button", { name: "Entrar al portal" }).click();
    await expect(page).not.toHaveURL(/\/auth\/mfa/);
    expect((await page.request.get("/api/professional/dashboard")).status()).not.toBe(401);
    await proContext.close();

    // 2. Segundo acceso con un código de respaldo.
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    const second = await loginFromPortal(secondPage, { email, password });
    await second.submitButton.click();
    await expect(secondPage).toHaveURL(/\/auth\/mfa/);
    await secondPage.getByRole("button", { name: "No tengo el celular: usar un código de respaldo" }).click();
    await secondPage.getByLabel("Código de respaldo").fill(backupCode);
    await secondPage.getByRole("button", { name: "Verificar" }).click();
    await expect(secondPage).not.toHaveURL(/\/auth\/mfa/);

    // 3. El admin restablece el MFA: la sesión abierta vuelve a quedar pendiente.
    expect((await admin.delete(`/api/users/${userId}/mfa`)).ok()).toBeTruthy();
    expect((await secondPage.request.get("/api/professional/dashboard")).status()).toBe(401);
    await secondPage.goto("/portal/professional", { waitUntil: "domcontentloaded" });
    await expect(secondPage).toHaveURL(/\/auth\/mfa/);
    await expect(secondPage.getByRole("heading", { name: "Activa la verificación en dos pasos" })).toBeVisible();
    await secondContext.close();
  });
});

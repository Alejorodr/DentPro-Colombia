import { expect, type Page } from "@playwright/test";

import { E2E_MFA_SECRET } from "@/lib/auth/e2e-mfa";
import { generateTotp, totpStep, TOTP_PERIOD_SECONDS } from "@/lib/auth/totp";

/**
 * Completa el segundo paso (DOG-28) para un usuario sembrado, cuyo secreto es E2E_MFA_SECRET.
 * Si otro worker ya usó el código de este intervalo, espera al siguiente y reintenta una vez.
 */
export async function completeSeededMfaChallenge(page: Page) {
  await expect(page).toHaveURL(/\/auth\/mfa/);
  const input = page.getByLabel("Código de verificación");
  const submit = page.getByRole("button", { name: "Verificar" });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await input.fill(generateTotp(E2E_MFA_SECRET, totpStep(Date.now())));
    await submit.click();
    const left = await Promise.race([
      page.waitForURL((url) => !url.pathname.startsWith("/auth/mfa"), { timeout: 10_000 }).then(() => true),
      page.getByTestId("mfa-error").waitFor({ timeout: 10_000 }).then(() => false),
    ]);
    if (left) return;
    const msIntoStep = Date.now() % (TOTP_PERIOD_SECONDS * 1000);
    await page.waitForTimeout(TOTP_PERIOD_SECONDS * 1000 - msIntoStep + 500);
  }
  throw new Error("No se pudo completar la verificación en dos pasos en E2E.");
}

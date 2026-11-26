import { defineConfig } from "@playwright/test";

// @ts-expect-error -- módulo .mjs sin tipos
import { assertLocalE2EDatabase } from "./scripts/e2e-db-guard.mjs";

// También cubre `npx playwright test` sin pasar por scripts/run-e2e.mjs.
assertLocalE2EDatabase();

const isProdE2E = process.env.E2E_ENV === "production";
const e2eBaseUrl = "http://127.0.0.1:3000";
const nextStartCommand = "pnpm exec next start -H 127.0.0.1 -p 3000";

const e2eEnvDefaults = {
  OPS_ENABLED: "1",
  OPS_KEY: "ops-test-key",
  SEED_ADMIN_EMAIL: "admin@dentpro.test",
  SEED_ADMIN_PASSWORD: "Test1234!",
  TEST_AUTH_BYPASS: "1",
  NEXTAUTH_SECRET: "test-secret",
  NEXTAUTH_URL: e2eBaseUrl,
  NEXT_TELEMETRY_DISABLED: "1",
  PRISMA_QUERY_TIMEOUT_MS: "60000",
};

for (const [key, value] of Object.entries(e2eEnvDefaults)) {
  if (!process.env[key] || key === "NEXTAUTH_URL") {
    process.env[key] = value;
  }
}

const webServerCommand = isProdE2E
  ? `pnpm run vercel-build && cross-env NODE_ENV=production ${nextStartCommand}`
  : `pnpm run vercel-build && cross-env NODE_ENV=test ${nextStartCommand}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: e2eBaseUrl,
    headless: true,
    // DOG-36: la decisión de cookies ya tomada, para que el aviso fijo no tape botones en
    // los flujos. e2e/cookie-consent.spec.ts prueba el aviso con un visitante nuevo.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: e2eBaseUrl,
          localStorage: [
            {
              name: "dentpro-cookie-consent",
              value: JSON.stringify({ version: 1, thirdParty: false, updatedAt: "2026-01-01T00:00:00.000Z" }),
            },
          ],
        },
      ],
    },
  },
  webServer: {
    command: webServerCommand,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 600_000,
  },
});

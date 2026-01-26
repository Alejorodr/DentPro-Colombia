import { defineConfig } from "@playwright/test";

const isProdE2E = process.env.E2E_ENV === "production";
const commonEnv =
  "OPS_ENABLED=1 OPS_KEY=ops-test-key SEED_ADMIN_EMAIL=admin@dentpro.test SEED_ADMIN_PASSWORD=Test1234! TEST_AUTH_BYPASS=1 NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://127.0.0.1:3000 NEXT_TELEMETRY_DISABLED=1";

const webServerCommand = isProdE2E
  ? `${commonEnv} npm run vercel-build && NODE_ENV=production ${commonEnv} npm run start -- --hostname 127.0.0.1 --port 3000`
  : `${commonEnv} npm run vercel-build && NODE_ENV=test ${commonEnv} npm run start -- --hostname 127.0.0.1 --port 3000`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
  },
  webServer: {
    command: webServerCommand,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

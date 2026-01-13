import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
  },
  webServer: {
    command:
      "OPS_ENABLED=1 OPS_KEY=ops-test-key SEED_ADMIN_EMAIL=admin@dentpro.test SEED_ADMIN_PASSWORD=Test1234! TEST_AUTH_BYPASS=1 NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://127.0.0.1:3000 npm run vercel-build && NODE_ENV=test OPS_ENABLED=1 OPS_KEY=ops-test-key SEED_ADMIN_EMAIL=admin@dentpro.test SEED_ADMIN_PASSWORD=Test1234! TEST_AUTH_BYPASS=1 NEXTAUTH_SECRET=test-secret NEXTAUTH_URL=http://127.0.0.1:3000 npm run start -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

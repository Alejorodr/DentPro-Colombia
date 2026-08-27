import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shouldPreparePrismaTests() {
  if (process.env.VITEST_PRISMA_SETUP === "1") {
    return true;
  }
  if (process.env.VITEST_PRISMA_SETUP === "0") {
    return false;
  }

  const args = process.argv.slice(2).join(" ");
  const targetsAnalyticsSpec = /tests[\\/]+analytics-admin\.spec\.ts/.test(args);
  const hasSpecificTestFileFilter = /\b\S+\.(?:spec|test)\.[cm]?[jt]sx?\b/.test(args);

  return targetsAnalyticsSpec || !hasSpecificTestFileFilter;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    pool: "threads",
    globalSetup: shouldPreparePrismaTests() ? ["./tests/helpers/prisma-global-setup.ts"] : [],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    exclude: [".next/**", ".agents/**", ".claude/**", "e2e/**", "**/node_modules/**"],
    server: {
      deps: {
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
});

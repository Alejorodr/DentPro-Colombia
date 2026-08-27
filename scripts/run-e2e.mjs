import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const shouldRun = process.env.RUN_E2E === "1";
const e2eBaseUrl = "http://127.0.0.1:3000";

if (!shouldRun) {
  console.log("Skipping Playwright E2E. Set RUN_E2E=1 to enable.");
  process.exit(0);
}

rmSync(path.join(process.cwd(), ".next"), {
  force: true,
  maxRetries: 3,
  recursive: true,
  retryDelay: 500,
});

const browserPathEnv = process.env.PLAYWRIGHT_BROWSERS_PATH;
const platformBrowserPath =
  process.platform === "win32"
    ? path.join(os.homedir(), "AppData", "Local", "ms-playwright")
    : path.join(os.homedir(), ".cache", "ms-playwright");
const defaultBrowserPath =
  browserPathEnv && browserPathEnv !== "0"
    ? browserPathEnv
    : platformBrowserPath;

if (!existsSync(defaultBrowserPath)) {
  console.log("Playwright browsers not found. Installing chromium...");
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm exec playwright install --with-deps chromium", { stdio: "inherit", shell: true, env: process.env });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("Playwright browser install failed."))));
  });
}

const suite = process.env.E2E_SUITE ?? "full";
const childEnv = { ...process.env };
loadEnv({ path: ".env", processEnv: childEnv, quiet: true });
loadEnv({ path: ".env.local", processEnv: childEnv, override: true, quiet: true });
Object.assign(childEnv, process.env);

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
  if (!childEnv[key] || key === "NEXTAUTH_URL") {
    childEnv[key] = value;
  }
}

delete childEnv.npm_config_verify_deps_before_run;
delete childEnv.npm_config__jsr_registry;
delete childEnv.NPM_CONFIG_VERIFY_DEPS_BEFORE_RUN;
delete childEnv.NPM_CONFIG__JSR_REGISTRY;
delete childEnv.NO_COLOR;
delete childEnv.FORCE_COLOR;

console.log(
  "[run-e2e] runtime",
  JSON.stringify({
    suite,
    runE2E: childEnv.RUN_E2E ?? "0",
    nodeEnv: childEnv.NODE_ENV ?? "<unset>",
    opsEnabled: childEnv.OPS_ENABLED ?? "<unset>",
    hasOpsKey: Boolean(childEnv.OPS_KEY),
    nextAuthUrl: childEnv.NEXTAUTH_URL ?? "<unset>",
  }),
);

const grep = suite === "smoke" ? "--grep @smoke" : "";
const workers = suite === "smoke" ? "--workers=1" : "";

if (suite === "smoke") {
  console.log("[run-e2e] smoke suite = home + auth + receptionist critical path + minimal clinical flow");
}

const PRISMA_P2021_HINT =
  "Database schema not initialized for E2E runtime. Required tables not found.";

function createE2EOutputWriter(stream) {
  let suppressedWebServerLines = 0;

  return (chunk) => {
    const lines = chunk.toString().split(/(?<=\r?\n)/);
    for (const line of lines) {
      if (!line) {
        continue;
      }

      if (line.includes("[WebServer] ⨯ Error: The destination stream closed early.")) {
        suppressedWebServerLines = 3;
        continue;
      }

      if (suppressedWebServerLines > 0 && line.startsWith("[WebServer]")) {
        suppressedWebServerLines -= 1;
        continue;
      }

      stream.write(line);
    }
  };
}

const run = (command) =>
  new Promise((resolve, reject) => {
    let output = "";
    const writeStdout = createE2EOutputWriter(process.stdout);
    const writeStderr = createE2EOutputWriter(process.stderr);
    const child = spawn(command, { stdio: ["inherit", "pipe", "pipe"], shell: true, env: childEnv });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      writeStdout(chunk);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      writeStderr(chunk);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      if (output.includes("P2021")) {
        console.error(`[run-e2e] ${PRISMA_P2021_HINT}`);
      }

      reject(new Error(`Command failed: ${command}`));
    });
  });

await run(`pnpm exec playwright test ${grep} ${workers}`.trim());

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const shouldRun = process.env.RUN_E2E === "1";

if (!shouldRun) {
  console.log("Skipping Playwright E2E. Set RUN_E2E=1 to enable.");
  process.exit(0);
}

const browserPathEnv = process.env.PLAYWRIGHT_BROWSERS_PATH;
const defaultBrowserPath =
  browserPathEnv && browserPathEnv !== "0"
    ? browserPathEnv
    : path.join(os.homedir(), ".cache", "ms-playwright");

if (!existsSync(defaultBrowserPath)) {
  console.log("Playwright browsers not found. Installing chromium...");
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm exec playwright install --with-deps chromium", { stdio: "inherit", shell: true, env: process.env });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("Playwright browser install failed."))));
  });
}

const suite = process.env.E2E_SUITE ?? "full";

console.log(
  "[run-e2e] runtime",
  JSON.stringify({
    suite,
    runE2E: process.env.RUN_E2E ?? "0",
    nodeEnv: process.env.NODE_ENV ?? "<unset>",
    opsEnabled: process.env.OPS_ENABLED ?? "<unset>",
    hasOpsKey: Boolean(process.env.OPS_KEY),
    nextAuthUrl: process.env.NEXTAUTH_URL ?? "<unset>",
  }),
);

const grep = suite === "smoke" ? "--grep @smoke" : "";

const PRISMA_P2021_HINT =
  "Database schema not initialized for E2E runtime. Required tables not found.";

const run = (command) =>
  new Promise((resolve, reject) => {
    let output = "";
    const child = spawn(command, { stdio: ["inherit", "pipe", "pipe"], shell: true, env: process.env });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
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

await run(`pnpm exec playwright test ${grep}`.trim());

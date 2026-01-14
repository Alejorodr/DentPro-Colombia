import { spawn } from "node:child_process";

const shouldRun = process.env.RUN_E2E === "1";

if (!shouldRun) {
  console.log("Skipping Playwright E2E. Set RUN_E2E=1 to enable.");
  process.exit(0);
}

const run = (command) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, { stdio: "inherit", shell: true, env: process.env });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command}`));
    });
  });

await run("npx playwright install --with-deps chromium");
await run("npx playwright test");

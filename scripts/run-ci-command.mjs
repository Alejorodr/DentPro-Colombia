import { spawn } from "node:child_process";

const command = process.argv.slice(2).join(" ");

if (!command) {
  console.error("Missing command to run.");
  process.exit(1);
}

const env = { ...process.env };
if (env.CI && !env.NO_COLOR) {
  env.FORCE_COLOR = "0";
}

const child = spawn(command, { stdio: "inherit", shell: true, env });
child.on("exit", (code) => {
  process.exit(code ?? 0);
});

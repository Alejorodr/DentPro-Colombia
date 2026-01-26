#!/usr/bin/env node

import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  console.warn(
    "[prisma-generate-safe] DATABASE_URL faltante. Omitiendo prisma generate durante install."
  );
  process.exit(0);
}

const child = spawn(
  "npx",
  ["--yes", "prisma", "generate", "--schema", "prisma/schema.prisma"],
  { stdio: "inherit" }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

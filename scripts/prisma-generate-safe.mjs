#!/usr/bin/env node

import { spawn } from "node:child_process";

const isVercel = process.env.VERCEL === "1";
const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;

if (isVercel) {
  console.log("[prisma-generate-safe] Vercel runtime detected, skipping postinstall prisma generate.");
  process.exit(0);
}

if (!databaseUrl) {
  console.warn(
    "[prisma-generate-safe] DATABASE_URL missing, skipping prisma generate during install."
  );
  process.exit(0);
}

const child = spawn(
  "pnpm",
  ["exec", "prisma", "generate", "--schema", "prisma/schema.prisma"],
  { stdio: "inherit" }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

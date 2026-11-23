// E2E locales contra un Postgres efímero en Docker, aislado de los servicios reales.
//
//   pnpm e2e:local            suite completa (equivalente al Nightly)
//   pnpm e2e:local:smoke      solo @smoke (equivalente al CI de PR)
//   pnpm e2e:db:down          baja el contenedor
//
// No carga .env.local: ahí viven credenciales reales (Neon, Resend, Upstash, Blob,
// Sentry). Las E2E siembran usuarios con contraseñas públicas y activan bypass de auth,
// así que corren con un entorno mínimo, igual al del workflow de CI.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { parse as parseEnv } from "dotenv";

const COMPOSE = ["compose", "-f", "docker-compose.e2e.yml"];
const LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54329/dentpro_e2e";
// Prisma exige que la shadow DB sea distinta de la principal (P3025); migrate deploy no la crea.
const LOCAL_SHADOW_DB = "postgresql://postgres:postgres@127.0.0.1:54329/dentpro_e2e_shadow";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
// Todo lo que no sea flag propio se pasa a Playwright: pnpm e2e:local -- e2e/auth.spec.ts
const playwrightArgs = rawArgs.filter((arg) => !["--smoke", "--down", "--"].includes(arg));
const suite = args.has("--smoke") ? "smoke" : "full";

function run(command, commandArgs, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: "inherit", shell: process.platform === "win32", env });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${commandArgs.join(" ")} terminó con código ${code}`)),
    );
  });
}

if (args.has("--down")) {
  await run("docker", [...COMPOSE, "down", "--volumes"]);
  process.exit(0);
}

// Entorno mínimo: solo lo del sistema + valores de prueba. Nada de .env.local.
const env = {
  PATH: process.env.PATH,
  Path: process.env.Path,
  SystemRoot: process.env.SystemRoot,
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  APPDATA: process.env.APPDATA,
  LOCALAPPDATA: process.env.LOCALAPPDATA,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
  ComSpec: process.env.ComSpec,
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH,
  DATABASE_URL: LOCAL_DB,
  DATABASE_URL_UNPOOLED: LOCAL_DB,
  SHADOW_DATABASE_URL: LOCAL_SHADOW_DB,
  // AUTH_JWT_SECRET/AUTH_SECRET de .env.local quedan en "": lib/auth/secret.ts los trata como ausentes.
  NEXTAUTH_SECRET: "test-secret",
  NEXTAUTH_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  AUTH_TRUST_HOST: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  OPS_ENABLED: "1",
  OPS_KEY: "ops-test-key",
  SEED_ADMIN_EMAIL: "admin@dentpro.test",
  SEED_ADMIN_PASSWORD: "Test1234!",
  // Igual que GitHub Actions: con CI=true + RUN_E2E=1 la app entra en la etapa "ci-e2e"
  // (lib/auth/runtime.ts), que permite el limitador en memoria en vez de fallar cerrado.
  CI: "true",
  RUN_E2E: "1",
  E2E_SUITE: suite,
  E2E_WORKERS: "2", // igual que el runner de GitHub Actions
  E2E_ARGS: playwrightArgs.join(" "),
  E2E_SKIP_ENV_FILES: "1",
};
for (const key of Object.keys(env)) {
  if (env[key] === undefined) delete env[key];
}

// `next build` corre en modo producción y Next carga .env.local por su cuenta, pero no
// pisa variables ya definidas (aunque estén vacías). Se toman solo los NOMBRES de
// .env/.env.local y se fijan en "" para que ningún valor real (Resend, Upstash, Blob,
// Sentry, Google...) llegue al servidor ni al bundle del cliente de las E2E.
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const key of Object.keys(parseEnv(readFileSync(file)))) {
    // TEST_AUTH_* son solo de prueba y los specs usan `?? valor por defecto`: un "" anularía
    // el default. Se dejan sin definir, igual que en CI.
    if (key.startsWith("TEST_AUTH_")) continue;
    if (!(key in env)) env[key] = "";
  }
}

console.log("[e2e-local] Levantando Postgres efímero y vacío (127.0.0.1:54329)...");
// --force-recreate + tmpfs = base vacía en cada corrida, como en CI. Sin esto los datos se
// acumulan entre corridas (p. ej. el tope de 3 citas activas del paciente demo).
await run("docker", [...COMPOSE, "up", "-d", "--wait", "--force-recreate"]);

console.log("[e2e-local] Aplicando migraciones...");
await run("pnpm", ["exec", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"], env);

console.log(`[e2e-local] Corriendo suite "${suite}"...`);
await run("node", ["scripts/run-e2e.mjs"], env);

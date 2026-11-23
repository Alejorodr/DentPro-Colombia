#!/usr/bin/env node
// Escaneo local de secretos con gitleaks (DOG-20), igual al workflow "Secret Scan".
// Corre la imagen oficial en Docker, así que no hace falta instalar gitleaks.
//
//   pnpm secrets:scan            # todo el historial de Git (todas las ramas)
//   pnpm secrets:scan -- staged  # solo lo que está en el área de preparación
import { spawnSync } from "node:child_process";

const IMAGE =
  "zricethezav/gitleaks@sha256:cdbb7c955abce02001a9f6c9f602fb195b7fadc1e812065883f695d1eeaba854"; // v8.28.0

const mode = process.argv.slice(2).find((arg) => arg !== "--") ?? "history";
const scanArgs =
  mode === "staged"
    ? ["git", "/repo", "--staged"]
    : ["git", "/repo", "--log-opts=--all"];

const result = spawnSync(
  "docker",
  ["run", "--rm", "-v", `${process.cwd()}:/repo`, IMAGE, ...scanArgs, "--redact", "--no-banner", "--exit-code", "1"],
  { stdio: "inherit" },
);

if (result.error) {
  console.error("No se pudo ejecutar Docker. ¿Está Docker Desktop abierto?", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);

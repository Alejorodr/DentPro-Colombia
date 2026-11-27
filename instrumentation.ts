import type { Instrumentation } from "next";

import { sentryDsn } from "@/lib/monitoring/sentry-dsn";

/**
 * Inicializa Sentry en el servidor (DOG-16). Sin DSN (`SENTRY_DSN` o el `NEXT_PUBLIC_SENTRY_DSN`
 * de la integración de Vercel, DOG-69) el SDK queda deshabilitado,
 * así que en local y en E2E no hace nada. El cliente no se instrumenta a propósito: el SDK
 * de navegador pesa en el bundle y los errores relevantes ocurren en el servidor.
 */
export async function register() {
  if (!sentryDsn()) return;
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!sentryDsn()) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};

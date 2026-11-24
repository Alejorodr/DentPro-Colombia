import type { Instrumentation } from "next";

/**
 * Inicializa Sentry en el servidor (DOG-16). Sin `SENTRY_DSN` el SDK queda deshabilitado,
 * así que en local y en E2E no hace nada. El cliente no se instrumenta a propósito: el SDK
 * de navegador pesa en el bundle y los errores relevantes ocurren en el servidor.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};

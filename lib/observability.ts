import { logger } from "@/lib/logger";

export type OperationalAlert = {
  event: string;
  severity?: "info" | "warn" | "error";
  context?: Record<string, unknown>;
};

export function reportOperationalAlert({ event, severity = "error", context = {} }: OperationalAlert) {
  const payload = {
    event,
    ...context,
  };

  if (severity === "info") {
    logger.info(payload, "Evento operativo");
    return;
  }

  if (severity === "warn") {
    logger.warn(payload, "Evento operativo");
    return;
  }

  logger.error(payload, "Evento operativo");
}

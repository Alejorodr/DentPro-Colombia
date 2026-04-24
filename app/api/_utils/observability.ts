import { logger } from "@/lib/logger";

type ApiLogContext = {
  event: string;
  route: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
    };
  }

  return { message: String(error) };
}

export function logApiError(context: ApiLogContext, error: unknown) {
  logger.error(
    {
      event: context.event,
      route: context.route,
      userId: context.userId,
      ...context.metadata,
      error: serializeError(error),
    },
    "API request failed",
  );
}

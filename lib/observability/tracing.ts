import { logger } from "@/lib/logger";

type TraceStatus = "ok" | "error";

export function startApiTrace(params: { requestId: string; endpoint: string; method: string; userId?: string; role?: string }) {
  const startedAt = performance.now();

  return {
    end(payload: { status: TraceStatus; result?: string; itemCount?: number; error?: unknown; extra?: Record<string, unknown> }) {
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const baseLog = {
        event: "api.trace",
        requestId: params.requestId,
        endpoint: params.endpoint,
        method: params.method,
        userId: params.userId,
        role: params.role,
        durationMs,
        status: payload.status,
        result: payload.result ?? payload.status,
        itemCount: payload.itemCount,
        timestamp: new Date().toISOString(),
        ...(payload.extra ?? {}),
      };

      if (payload.status === "error") {
        logger.error({
          ...baseLog,
          error: payload.error instanceof Error ? payload.error.message : payload.error,
        });
        return;
      }

      logger.info(baseLog);
    },
  };
}

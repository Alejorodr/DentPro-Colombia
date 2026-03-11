import { logger } from "@/lib/logger";

type MetricStatus = "ok" | "error";

export function startApiMetric(metric: string, base: Record<string, unknown> = {}) {
  const startedAt = performance.now();

  return {
    end(params: {
      status: MetricStatus;
      itemCount?: number;
      extra?: Record<string, unknown>;
      error?: unknown;
    }) {
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const payload = {
        metric,
        status: params.status,
        durationMs,
        itemCount: params.itemCount,
        ...base,
        ...(params.extra ?? {}),
        ...(params.error instanceof Error ? { error: params.error.message } : {}),
        timestamp: new Date().toISOString(),
      };

      if (params.status === "error") {
        logger.error(payload);
        return;
      }
      logger.info(payload);
    },
  };
}

import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { logger } from "@/lib/logger";
import { markAllNotificationsRead } from "@/lib/notifications";
import { startApiMetric } from "@/lib/observability/metrics";

export async function PATCH() {
  const metric = startApiMetric("notifications_read_all");
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    metric.end({ status: "error", extra: { code: 401 } });
    return errorResponse("No autorizado.", 401);
  }

  const result = await markAllNotificationsRead({ userId: sessionUser.id });
  logger.info({
    event: "notifications_read_all",
    action: "notifications_read_all",
    actor: sessionUser.role,
    appointmentId: null,
    timestamp: new Date().toISOString(),
    updatedCount: result.count,
    result: "ok",
  });
  metric.end({ status: "ok", itemCount: result.count, extra: { actor: sessionUser.role } });
  return NextResponse.json({ updatedCount: result.count });
}

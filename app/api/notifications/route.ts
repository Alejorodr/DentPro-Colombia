import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getRequestId } from "@/app/api/_utils/request";
import { logger } from "@/lib/logger";
import { startApiMetric } from "@/lib/observability/metrics";
import { startApiTrace } from "@/lib/observability/tracing";
import { getPrismaClient } from "@/lib/prisma";

const querySchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
  scope: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const metric = startApiMetric("notifications_fetch");
  const requestId = getRequestId(request);
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    metric.end({ status: "error", extra: { code: 401, requestId } });
    return errorResponse("No autorizado.", 401);
  }

  const trace = startApiTrace({
    requestId,
    endpoint: "/api/notifications",
    method: "GET",
    userId: sessionUser.id,
    role: sessionUser.role,
  });

  try {
    const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = querySchema.safeParse(rawQuery);
    if (!parsed.success) {
      metric.end({ status: "error", extra: { code: 400, requestId } });
      trace.end({ status: "error", result: "validation_error", extra: { code: 400 } });
      return errorResponse("Parámetros inválidos de notificaciones.", 400);
    }

    const unreadOnly = parsed.data.unread === "true";
    const isAdminScope = parsed.data.scope === "admin" && isAuthorized(sessionUser.role, ["ADMINISTRADOR"]);

    const prisma = getPrismaClient();
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          ...(isAdminScope ? {} : { userId: sessionUser.id }),
          ...(unreadOnly ? { readAt: null } : {}),
          ...(parsed.data.cursor ? { createdAt: { lt: new Date(parsed.data.cursor) } } : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: parsed.data.limit + 1,
        select: {
          id: true,
          title: true,
          body: true,
          createdAt: true,
          readAt: true,
          entityType: true,
          entityId: true,
          ...(isAdminScope ? { user: { select: { name: true, lastName: true, email: true } } } : {}),
        },
      }),
      prisma.notification.count({
        where: {
          ...(isAdminScope ? {} : { userId: sessionUser.id }),
          readAt: null,
        },
      }),
    ]);

    const hasMore = notifications.length > parsed.data.limit;
    const sliced = notifications.slice(0, parsed.data.limit);
    const nextCursor = hasMore ? sliced.at(-1)?.createdAt.toISOString() ?? null : null;

    logger.info({
      event: "notification_center_read",
      action: "notification_center_read",
      actor: sessionUser.role,
      userId: sessionUser.id,
      requestId,
      appointmentId: null,
      timestamp: new Date().toISOString(),
      count: sliced.length,
      result: "ok",
    });

    metric.end({ status: "ok", itemCount: sliced.length, extra: { actor: sessionUser.role, requestId } });
    trace.end({ status: "ok", result: "ok", itemCount: sliced.length, extra: { adminScope: isAdminScope } });

    return NextResponse.json({ notifications: sliced, unreadCount, nextCursor });
  } catch (error) {
    metric.end({ status: "error", extra: { code: 500, requestId }, error });
    trace.end({ status: "error", result: "internal_error", error, extra: { code: 500 } });
    return errorResponse("No se pudieron cargar las notificaciones.", 500);
  }
}

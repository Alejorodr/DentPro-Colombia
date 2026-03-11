import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { logger } from "@/lib/logger";
import { getPrismaClient } from "@/lib/prisma";
import { startApiMetric } from "@/lib/observability/metrics";

const querySchema = z.object({
  unread: z.enum(["true", "false"]).optional(),
  scope: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const metric = startApiMetric("notifications_fetch");
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    metric.end({ status: "error", extra: { code: 401 } });
    return errorResponse("No autorizado.", 401);
  }

  const rawQuery = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(rawQuery);
  if (!parsed.success) {
    metric.end({ status: "error", extra: { code: 400 } });
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
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit + 1,
      include: isAdminScope ? { user: { select: { name: true, lastName: true, email: true } } } : undefined,
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
    appointmentId: null,
    timestamp: new Date().toISOString(),
    count: sliced.length,
    result: "ok",
  });

  metric.end({ status: "ok", itemCount: sliced.length, extra: { actor: sessionUser.role } });

  return NextResponse.json({ notifications: sliced, unreadCount, nextCursor });
}

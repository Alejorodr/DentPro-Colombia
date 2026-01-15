import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const scope = searchParams.get("scope");
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;

  const prisma = getPrismaClient();
  const isAdminScope = scope === "admin" && isAuthorized(sessionUser.role, ["ADMINISTRADOR"]);
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        ...(isAdminScope ? {} : { userId: sessionUser.id }),
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: isAdminScope ? { user: { select: { name: true, lastName: true, email: true } } } : undefined,
    }),
    prisma.notification.count({
      where: {
        ...(isAdminScope ? {} : { userId: sessionUser.id }),
        readAt: null,
      },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

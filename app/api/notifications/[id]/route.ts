import { NextResponse } from "next/server";

import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const notification = await prisma.notification.findUnique({ where: { id } });

  const canReadAny = isAuthorized(sessionUser.role, ["ADMINISTRADOR"]);
  if (!notification || (!canReadAny && notification.userId !== sessionUser.id)) {
    return errorResponse("Notificación no encontrada.", 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json(updated);
}

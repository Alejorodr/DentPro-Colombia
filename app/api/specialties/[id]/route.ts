import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para actualizar especialidades.", 403);
  }

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    defaultSlotDurationMinutes?: number;
    active?: boolean;
  } | null;

  if (!payload) {
    return errorResponse("Solicitud inválida.");
  }

  const prisma = getPrismaClient();
  const updated = await prisma.specialty.update({
    where: { id: params.id },
    data: {
      name: payload.name?.trim() || undefined,
      defaultSlotDurationMinutes: payload.defaultSlotDurationMinutes ?? undefined,
      active: typeof payload.active === "boolean" ? payload.active : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para eliminar especialidades.", 403);
  }

  const prisma = getPrismaClient();
  await prisma.specialty.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

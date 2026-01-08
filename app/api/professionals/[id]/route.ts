import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para actualizar profesionales.", 403);
  }

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    lastName?: string;
    email?: string;
    password?: string;
    specialtyId?: string;
    slotDurationMinutes?: number | null;
    active?: boolean;
  } | null;

  if (!payload) {
    return errorResponse("Solicitud inválida.");
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

  const updated = await prisma.professionalProfile.update({
    where: { id },
    data: {
      specialty: payload.specialtyId ? { connect: { id: payload.specialtyId } } : undefined,
      slotDurationMinutes: payload.slotDurationMinutes ?? undefined,
      active: typeof payload.active === "boolean" ? payload.active : undefined,
      user: {
        update: {
          name: payload.name?.trim() ?? undefined,
          lastName: payload.lastName?.trim() ?? undefined,
          email: payload.email?.toLowerCase() ?? undefined,
          passwordHash: passwordHash ?? undefined,
        },
      },
    },
    include: { user: true, specialty: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para eliminar profesionales.", 403);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({ where: { id } });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  await prisma.user.delete({ where: { id: professional.userId } });
  return NextResponse.json({ ok: true });
}

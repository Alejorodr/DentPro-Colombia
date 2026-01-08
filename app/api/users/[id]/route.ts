import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { isUserRole, type UserRole } from "@/lib/auth/roles";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para actualizar usuarios.", 403);
  }

  const payload = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    role?: UserRole;
    name?: string;
    lastName?: string;
    phone?: string;
    documentId?: string;
    specialtyId?: string;
    slotDurationMinutes?: number | null;
  } | null;

  if (!payload) {
    return errorResponse("Solicitud inválida.");
  }

  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({ where: { id: params.id }, include: { patient: true, professional: true } });

  if (!existing) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  if (payload.role && !isUserRole(payload.role)) {
    return errorResponse("Rol inválido.");
  }

  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      email: payload.email?.toLowerCase() ?? undefined,
      name: payload.name?.trim() ?? undefined,
      lastName: payload.lastName?.trim() ?? undefined,
      role: payload.role ?? undefined,
      passwordHash: passwordHash ?? undefined,
    },
  });

  const targetRole = payload.role ?? existing.role;

  if (targetRole === "PACIENTE") {
    if (!existing.patient) {
      await prisma.patientProfile.create({
        data: { userId: params.id, phone: payload.phone?.trim() || null, documentId: payload.documentId?.trim() || null },
      });
    } else {
      await prisma.patientProfile.update({
        where: { userId: params.id },
        data: { phone: payload.phone?.trim() || undefined, documentId: payload.documentId?.trim() || undefined },
      });
    }
  }

  if (targetRole === "PROFESIONAL") {
    if (!payload.specialtyId && !existing.professional) {
      return errorResponse("La especialidad es obligatoria para profesionales.");
    }

    if (!existing.professional) {
      await prisma.professionalProfile.create({
        data: {
          userId: params.id,
          specialtyId: payload.specialtyId ?? existing.professional?.specialtyId ?? "",
          slotDurationMinutes: payload.slotDurationMinutes ?? null,
          active: true,
        },
      });
    } else {
      await prisma.professionalProfile.update({
        where: { userId: params.id },
        data: {
          specialtyId: payload.specialtyId ?? undefined,
          slotDurationMinutes: payload.slotDurationMinutes ?? undefined,
          active: true,
        },
      });
    }
  }

  if (targetRole !== "PACIENTE" && existing.patient) {
    await prisma.patientProfile.delete({ where: { userId: params.id } });
  }

  if (targetRole !== "PROFESIONAL" && existing.professional) {
    await prisma.professionalProfile.delete({ where: { userId: params.id } });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para eliminar usuarios.", 403);
  }

  const prisma = getPrismaClient();
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

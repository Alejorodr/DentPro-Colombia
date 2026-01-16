import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const canManagePatients = isAuthorized(sessionUser.role, ["ADMINISTRADOR", "RECEPCIONISTA"]);
  if (!canManagePatients) {
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
    active?: boolean;
    specialtyId?: string;
    slotDurationMinutes?: number | null;
  } | null;

  if (!payload) {
    return errorResponse("Solicitud inválida.");
  }

  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({ where: { id }, include: { patient: true, professional: true } });

  if (!existing) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  if (payload.role && !isUserRole(payload.role)) {
    return errorResponse("Rol inválido.");
  }

  if (sessionUser.role === "RECEPCIONISTA") {
    if (existing.role !== "PACIENTE") {
      return errorResponse("Recepción solo puede editar pacientes.", 403);
    }
    if (payload.role && payload.role !== "PACIENTE") {
      return errorResponse("Recepción no puede cambiar el rol.", 403);
    }
    if (payload.specialtyId || payload.slotDurationMinutes) {
      return errorResponse("Recepción no puede editar profesionales.", 403);
    }
  }

  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      email: payload.email?.toLowerCase() ?? undefined,
      name: payload.name?.trim() ?? undefined,
      lastName: payload.lastName?.trim() ?? undefined,
      role: sessionUser.role === "RECEPCIONISTA" ? undefined : payload.role ?? undefined,
      passwordHash: sessionUser.role === "RECEPCIONISTA" ? undefined : passwordHash ?? undefined,
    },
  });

  const targetRole = (sessionUser.role === "RECEPCIONISTA" ? existing.role : payload.role) ?? existing.role;
  if (existing.role !== targetRole) {
    logger.info({
      event: "user.role_changed",
      userId: id,
      previousRole: existing.role,
      nextRole: targetRole,
      actorId: sessionUser.id,
      actorRole: sessionUser.role,
    });
  }

  if (targetRole === "PACIENTE") {
    if (!existing.patient) {
      await prisma.patientProfile.create({
        data: {
          userId: id,
          phone: payload.phone?.trim() || null,
          documentId: payload.documentId?.trim() || null,
          active: typeof payload.active === "boolean" ? payload.active : true,
        },
      });
    } else {
      await prisma.patientProfile.update({
        where: { userId: id },
        data: {
          phone: payload.phone?.trim() || undefined,
          documentId: payload.documentId?.trim() || undefined,
          active: typeof payload.active === "boolean" ? payload.active : undefined,
        },
      });
    }
  }

  if (targetRole === "PROFESIONAL") {
    if (!payload.specialtyId && !existing.professional) {
      return errorResponse("La especialidad es obligatoria para profesionales.");
    }

    if (!existing.professional) {
      if (!payload.specialtyId) {
        return errorResponse("La especialidad es obligatoria para profesionales.");
      }
      await prisma.professionalProfile.create({
        data: {
          user: { connect: { id } },
          specialty: { connect: { id: payload.specialtyId } },
          slotDurationMinutes: payload.slotDurationMinutes ?? null,
          active: true,
        },
      });
    } else {
      await prisma.professionalProfile.update({
        where: { userId: id },
        data: {
          specialty: payload.specialtyId ? { connect: { id: payload.specialtyId } } : undefined,
          slotDurationMinutes: payload.slotDurationMinutes ?? undefined,
          active: true,
        },
      });
    }
  }

  if (targetRole !== "PACIENTE" && existing.patient) {
    await prisma.patientProfile.delete({ where: { userId: id } });
  }

  if (targetRole !== "PROFESIONAL" && existing.professional) {
    await prisma.professionalProfile.delete({ where: { userId: id } });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  const canManagePatients = isAuthorized(sessionUser.role, ["ADMINISTRADOR", "RECEPCIONISTA"]);
  if (!canManagePatients) {
    return errorResponse("No tienes permisos para eliminar usuarios.", 403);
  }

  const prisma = getPrismaClient();
  if (sessionUser.role === "RECEPCIONISTA") {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "PACIENTE") {
      return errorResponse("Recepción solo puede eliminar pacientes.", 403);
    }
  }
  await prisma.user.delete({ where: { id } });
  logger.info({
    event: "user.deleted",
    userId: id,
    actorId: sessionUser.id,
    actorRole: sessionUser.role,
  });
  return NextResponse.json({ ok: true });
}

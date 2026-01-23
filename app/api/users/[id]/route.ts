import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { requireRole, requireSession } from "@/lib/authz";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";
import { Prisma } from "@prisma/client";

const updateUserSchema = z.object({
  email: z.string().trim().email().max(120).optional(),
  password: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE).optional(),
  role: z.string().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  documentId: z.string().trim().max(40).optional(),
  active: z.boolean().optional(),
  specialtyId: z.string().uuid().optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { id } = await params;
  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para actualizar usuarios.", 403);
  }

  const { data: payload, error } = await parseJson(request, updateUserSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({ where: { id }, include: { patient: true, professional: true } });

  if (!existing) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  const requestedRole = payload.role as UserRole | undefined;
  if (requestedRole && !isUserRole(requestedRole)) {
    return errorResponse("Rol inválido.");
  }

  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id },
      data: {
        email: payload.email?.toLowerCase() ?? undefined,
        name: payload.name?.trim() ?? undefined,
        lastName: payload.lastName?.trim() ?? undefined,
        role: requestedRole ?? undefined,
        passwordHash: passwordHash ?? undefined,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
      if (target.includes("email")) {
        return errorResponse("El correo ya existe.", 400);
      }
    }
    return errorResponse("No se pudo actualizar el usuario.");
  }

  const targetRole = requestedRole ?? existing.role;
  if (existing.role !== targetRole) {
    logger.info({
      event: "user.role_changed",
      userId: id,
      previousRole: existing.role,
      nextRole: targetRole,
      actorId: sessionResult.user.id,
      actorRole: sessionResult.user.role,
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
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { id } = await params;
  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para eliminar usuarios.", 403);
  }

  const prisma = getPrismaClient();
  await prisma.user.delete({ where: { id } });
  logger.info({
    event: "user.deleted",
    userId: id,
    actorId: sessionResult.user.id,
    actorRole: sessionResult.user.role,
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";
import { Prisma } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

const updateProfessionalSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(120).optional(),
  password: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE).optional(),
  specialtyId: z.string().uuid().optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para actualizar profesionales.", 403);
  }

  const { data: payload, error } = await parseJson(request, updateProfessionalSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { id },
    select: { id: true, active: true },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : undefined;

  try {
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
      select: {
        id: true,
        userId: true,
        specialtyId: true,
        slotDurationMinutes: true,
        active: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            name: true,
            lastName: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        specialty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (typeof payload.active === "boolean" && payload.active !== professional.active) {
      await logAuditEvent({
        actor: { userId: sessionUser.id, role: sessionUser.role },
        action: "professional.activation.toggled",
        resourceType: "professional",
        resourceId: id,
        targetLabel: updated.user.email,
        status: "success",
        metadata: { previousActive: professional.active, newActive: payload.active },
      });
    }

    await logAuditEvent({
      actor: { userId: sessionUser.id, role: sessionUser.role },
      action: "professional.profile.updated",
      resourceType: "professional",
      resourceId: id,
      targetLabel: updated.user.email,
      status: "success",
      metadata: {
        specialtyId: updated.specialtyId,
        slotDurationMinutes: updated.slotDurationMinutes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
      if (target.includes("email")) {
        return errorResponse("El correo ya existe.", 400);
      }
    }
    return errorResponse("No se pudo actualizar el profesional.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { id } = await params;
  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para desactivar profesionales.", 403);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { id },
    select: { userId: true, active: true, user: { select: { email: true, active: true } } },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  // Idempotente: si ya está inactivo no se escribe nada.
  if (!professional.active && !professional.user.active) {
    return NextResponse.json({ ok: true });
  }

  // Soft delete: se conservan notas clínicas, citas y episodios asociados;
  // el acceso se bloquea vía user.active=false (verificado en cada auth()).
  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: professional.userId }, data: { active: false } }),
      prisma.professionalProfile.update({ where: { id }, data: { active: false } }),
    ]);
  } catch {
    return errorResponse("No se pudo desactivar el profesional.", 500);
  }

  await logAuditEvent({
    actor: { userId: sessionUser.id, role: sessionUser.role },
    action: "professional.deactivated",
    resourceType: "professional",
    resourceId: id,
    targetLabel: professional.user.email,
    status: "success",
    metadata: {
      mode: "soft",
      previousUserActive: professional.user.active,
      previousProfileActive: professional.active,
    },
  });

  return NextResponse.json({ ok: true });
}

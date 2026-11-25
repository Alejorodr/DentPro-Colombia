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
import { redactSensitiveAuthFields } from "@/lib/security/redaction";
import { logAuditEvent } from "@/lib/audit";
import { optionalImageUrl, optionalText } from "@/app/api/admin/homepage/_lib";
import { documentTypeSchema, rethusNumberSchema } from "@/lib/regulatory/colombia";

const updateUserSchema = z.object({
  email: z.string().trim().email().max(120).optional(),
  password: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE).optional(),
  role: z.string().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  documentType: documentTypeSchema.optional(),
  documentId: z.string().trim().max(40).optional(),
  active: z.boolean().optional(),
  specialtyId: z.string().uuid().optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).nullable().optional(),
  // undefined = no tocar; "" = borrar (el esquema lo convierte en null).
  rethusNumber: rethusNumberSchema.optional(),
  homepageBioShort: optionalText(600).optional(),
  homepageImageUrl: optionalImageUrl().optional(),
  homepageImageAlt: optionalText(180).optional(),
  showOnHomepage: z.boolean().optional(),
  homepageSortOrder: z.number().int().min(0).optional(),
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

  // Guard: no self-role-change
  if (id === sessionResult.user.id && payload.role && payload.role !== existing.role) {
    return errorResponse("No puedes cambiar tu propio rol.", 403);
  }

  // Guard: no self-deactivation
  if (id === sessionResult.user.id && payload.active === false) {
    return errorResponse("No puedes desactivarte a ti mismo.", 403);
  }

  // Guard: no demoting or deactivating the last active ADMINISTRADOR
  if (existing.role === "ADMINISTRADOR") {
    const isDemoting = payload.role !== undefined && payload.role !== "ADMINISTRADOR";
    const isDeactivating = payload.active === false;
    if (isDemoting || isDeactivating) {
      const otherActiveAdminCount = await prisma.user.count({
        where: { role: "ADMINISTRADOR", active: true, id: { not: id } },
      });
      if (otherActiveAdminCount === 0) {
        return errorResponse("No puedes degradar o desactivar al único administrador activo.", 400);
      }
    }
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
        passwordChangedAt: passwordHash ? new Date() : undefined,
        active: typeof payload.active === "boolean" ? payload.active : undefined,
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
    await logAuditEvent({
      actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
      action: "user.role.updated",
      resourceType: "user",
      resourceId: id,
      targetLabel: updated.email,
      status: "success",
      metadata: { previousRole: existing.role, newRole: targetRole },
    });
  }

  if (payload.password) {
    await logAuditEvent({
      actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
      action: "user.password.reset_by_admin",
      resourceType: "user",
      resourceId: id,
      targetLabel: updated.email,
      status: "success",
    });
  }

  if (typeof payload.active === "boolean" && payload.active !== existing.active) {
    await logAuditEvent({
      actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
      action: "user.activation.toggled",
      resourceType: "user",
      resourceId: id,
      targetLabel: updated.email,
      status: "success",
      metadata: { previousActive: existing.active, newActive: payload.active },
    });
  }

  const roleChanged = existing.role !== targetRole;

  if (targetRole === "PACIENTE") {
    // A previously deactivated profile (from an earlier role change away from PACIENTE)
    // is reactivated instead of creating a duplicate — userId is @unique.
    const patientActive =
      typeof payload.active === "boolean" ? payload.active : roleChanged ? true : undefined;
    if (!existing.patient) {
      await prisma.patientProfile.create({
        data: {
          userId: id,
          phone: payload.phone?.trim() || null,
          documentType: payload.documentType,
          documentId: payload.documentId?.trim() || null,
          active: typeof payload.active === "boolean" ? payload.active : true,
        },
      });
    } else {
      await prisma.patientProfile.update({
        where: { userId: id },
        data: {
          phone: payload.phone?.trim() || undefined,
          documentType: payload.documentType,
          documentId: payload.documentId?.trim() || undefined,
          active: patientActive,
        },
      });
    }
  }

  if (targetRole === "PROFESIONAL") {
    if (!payload.specialtyId && !existing.professional) {
      return errorResponse("La especialidad es obligatoria para profesionales.");
    }

    // Only touch professionalProfile.active on genuine role/active-status requests.
    // A save that only carries homepage-presence fields (see AdminSpecialistsCopyPanel,
    // Contenido → Equipo) must not silently reactivate a deactivated professional.
    // An explicit `active` wins (deactivating the user also deactivates the profile);
    // a role request without `active` (re)activates it, including a profile left
    // inactive by an earlier role change away from PROFESIONAL.
    const professionalActive =
      typeof payload.active === "boolean" ? payload.active : payload.role !== undefined ? true : undefined;

    if (!existing.professional) {
      if (!payload.specialtyId) {
        return errorResponse("La especialidad es obligatoria para profesionales.");
      }
      await prisma.professionalProfile.create({
        data: {
          user: { connect: { id } },
          specialty: { connect: { id: payload.specialtyId } },
          slotDurationMinutes: payload.slotDurationMinutes ?? null,
          rethusNumber: payload.rethusNumber ?? null,
          active: professionalActive,
          homepageBioShort: payload.homepageBioShort,
          homepageImageUrl: payload.homepageImageUrl,
          homepageImageAlt: payload.homepageImageAlt,
          showOnHomepage: typeof payload.showOnHomepage === "boolean" ? payload.showOnHomepage : undefined,
          homepageSortOrder: payload.homepageSortOrder ?? undefined,
        },
      });
    } else {
      await prisma.professionalProfile.update({
        where: { userId: id },
        data: {
          specialty: payload.specialtyId ? { connect: { id: payload.specialtyId } } : undefined,
          slotDurationMinutes: payload.slotDurationMinutes ?? undefined,
          rethusNumber: payload.rethusNumber,
          active: professionalActive,
          homepageBioShort: payload.homepageBioShort,
          homepageImageUrl: payload.homepageImageUrl,
          homepageImageAlt: payload.homepageImageAlt,
          showOnHomepage: typeof payload.showOnHomepage === "boolean" ? payload.showOnHomepage : undefined,
          homepageSortOrder: payload.homepageSortOrder ?? undefined,
        },
      });
    }
  }

  // Never hard-delete clinical profiles on a role change: deleting them would either
  // cascade (SignedConsent, MedicalAllergy, schedules...) or 500 on FK Restrict
  // (appointments, episodes). Deactivate instead; switching back reactivates them above.
  if (targetRole !== "PACIENTE" && existing.patient) {
    await prisma.patientProfile.update({ where: { userId: id }, data: { active: false } });
  }

  if (targetRole !== "PROFESIONAL" && existing.professional) {
    await prisma.professionalProfile.update({ where: { userId: id }, data: { active: false } });
  }

  return NextResponse.json(redactSensitiveAuthFields(updated));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { id } = await params;
  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para desactivar usuarios.", 403);
  }

  if (id === sessionResult.user.id) {
    return errorResponse("No puedes desactivarte a ti mismo.", 403);
  }

  const prisma = getPrismaClient();
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, active: true, email: true } });

  if (!existing) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  if (existing.role === "ADMINISTRADOR") {
    const otherActiveAdminCount = await prisma.user.count({
      where: { role: "ADMINISTRADOR", active: true, id: { not: id } },
    });
    if (otherActiveAdminCount === 0) {
      return errorResponse("No puedes desactivar al único administrador activo.", 400);
    }
  }

  // Soft delete: a hard user.delete would cascade clinical records (ClinicalNote,
  // SignedConsent.acceptedByUser, AccessLog...) or 500 on FK Restrict when the user
  // has appointments/episodes. Deactivate the account and its profiles instead.
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { active: false } });
      await tx.patientProfile.updateMany({ where: { userId: id }, data: { active: false } });
      await tx.professionalProfile.updateMany({ where: { userId: id }, data: { active: false } });
    });
  } catch (error) {
    logger.error({ event: "user.deactivate_failed", userId: id, error: String(error) });
    return errorResponse("No se pudo desactivar el usuario.", 500);
  }

  logger.info({
    event: "user.deactivated",
    userId: id,
    actorId: sessionResult.user.id,
    actorRole: sessionResult.user.role,
  });
  await logAuditEvent({
    actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
    action: "user.deactivated",
    resourceType: "user",
    resourceId: id,
    targetLabel: existing.email,
    status: "success",
    metadata: { mode: "soft", previousRole: existing.role, previousActive: existing.active },
  });
  return NextResponse.json({ ok: true, active: false });
}

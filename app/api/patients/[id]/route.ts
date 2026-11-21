import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { redactSensitiveAuthFields } from "@/lib/security/redaction";
import { logAuditEvent } from "@/lib/audit";

const updatePatientSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  documentId: z.string().trim().max(40).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["RECEPCIONISTA", "ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, updatePatientSchema);
  if (error) {
    return error;
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({
    where: { id },
    select: { userId: true, user: { select: { role: true, email: true } } },
  });

  // Un perfil de paciente puede sobrevivir (inactivo) a un cambio de rol. Sin este guard,
  // recepción podría cambiar el correo de un admin o profesional y tomar su cuenta.
  if (!patient || patient.user.role !== "PACIENTE") {
    return errorResponse("Paciente no encontrado.", 404);
  }

  // El correo es la identidad de acceso (login y recuperación de contraseña): solo el admin
  // puede cambiarlo. Reenviar el mismo correo (como hace el formulario) no cuenta como cambio.
  const requestedEmail = payload.email?.toLowerCase();
  const emailChanged = requestedEmail !== undefined && requestedEmail !== patient.user.email.toLowerCase();
  if (emailChanged && sessionResult.user.role !== "ADMINISTRADOR") {
    return errorResponse("Solo un administrador puede cambiar el correo de un paciente.", 403);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: patient.userId },
      data: {
        email: emailChanged ? requestedEmail : undefined,
        name: payload.name?.trim() ?? undefined,
        lastName: payload.lastName?.trim() ?? undefined,
        patient: {
          update: {
            phone: payload.phone?.trim() || undefined,
            documentId: payload.documentId?.trim() || undefined,
            active: typeof payload.active === "boolean" ? payload.active : undefined,
          },
        },
      },
      include: { patient: true },
    });

    await logAuditEvent({
      actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
      action: "patient.updated",
      resourceType: "patient",
      resourceId: id,
      targetLabel: updated.email,
      status: "success",
      metadata: {
        fieldsChanged: Object.keys(payload),
      },
    });

    return NextResponse.json(redactSensitiveAuthFields(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
      if (target.includes("email")) {
        return errorResponse("El correo ya existe.", 400);
      }
    }
    return errorResponse("No se pudo actualizar el paciente.");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  // Desactivar un paciente es una acción sensible: solo administración.
  // Recepción puede alternar `active` vía PATCH, pero no usar este endpoint.
  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para desactivar pacientes.", 403);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({
    where: { id },
    select: { userId: true, active: true, user: { select: { email: true, active: true, role: true } } },
  });

  if (!patient || patient.user.role !== "PACIENTE") {
    return errorResponse("Paciente no encontrado.", 404);
  }

  // Idempotente: si ya está inactivo no se escribe nada.
  if (!patient.active && !patient.user.active) {
    return NextResponse.json({ ok: true });
  }

  // Soft delete: se conserva la historia clínica, consentimientos y alergias
  // (requisito legal de retención); el acceso se bloquea vía user.active=false.
  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: patient.userId }, data: { active: false } }),
      prisma.patientProfile.update({ where: { id }, data: { active: false } }),
    ]);
  } catch {
    return errorResponse("No se pudo desactivar el paciente.", 500);
  }

  await logAuditEvent({
    actor: { userId: sessionResult.user.id, role: sessionResult.user.role },
    action: "patient.deactivated",
    resourceType: "patient",
    resourceId: id,
    targetLabel: patient.user.email,
    status: "success",
    metadata: {
      mode: "soft",
      previousUserActive: patient.user.active,
      previousProfileActive: patient.active,
    },
  });

  return NextResponse.json({ ok: true });
}

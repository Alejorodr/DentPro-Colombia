import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
    include: { user: true },
  });

  if (!patient) {
    return errorResponse("Paciente no encontrado.", 404);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: patient.userId },
      data: {
        email: payload.email?.toLowerCase() ?? undefined,
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

    return NextResponse.json(updated);
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

  const roleError = requireRole(sessionResult.user, ["RECEPCIONISTA", "ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({ where: { id } });

  if (!patient) {
    return errorResponse("Paciente no encontrado.", 404);
  }

  await prisma.user.delete({ where: { id: patient.userId } });

  return NextResponse.json({ ok: true });
}

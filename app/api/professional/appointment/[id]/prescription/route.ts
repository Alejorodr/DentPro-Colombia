import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { PrescriptionItemType } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/authz";

const prescriptionSchema = z.object({
  item: z.object({
    type: z.nativeEnum(PrescriptionItemType).optional(),
    name: z.string().trim().min(1).max(120),
    dosage: z.string().trim().max(200).optional(),
    frequency: z.string().trim().max(200).optional(),
    instructions: z.string().trim().max(500).optional(),
  }),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, prescriptionSchema);
  if (error) {
    return error;
  }

  const item = payload.item;
  const name = item.name.trim();

  const { id } = await params;
  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!appointment || appointment.professionalId !== professional.id) {
    return errorResponse("Cita no encontrada.", 404);
  }

  const prescription = await prisma.prescription.upsert({
    where: { appointmentId: appointment.id },
    update: {},
    create: {
      appointmentId: appointment.id,
    },
    include: { items: true },
  });

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId: prescription.id,
      type: item.type ?? PrescriptionItemType.MEDICATION,
      name,
      dosage: item.dosage?.trim() || null,
      frequency: item.frequency?.trim() || null,
      instructions: item.instructions?.trim() || null,
    },
  });

  const updated = await prisma.prescription.findUnique({
    where: { id: prescription.id },
    include: { items: true },
  });

  return NextResponse.json({ prescription: updated });
}

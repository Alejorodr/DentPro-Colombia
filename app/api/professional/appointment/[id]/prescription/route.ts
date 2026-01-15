import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { PrescriptionItemType } from "@prisma/client";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const payload = (await request.json().catch(() => null)) as {
    item?: {
      type?: PrescriptionItemType;
      name?: string;
      dosage?: string;
      frequency?: string;
      instructions?: string;
    };
  } | null;

  const item = payload?.item;
  const name = item?.name?.trim();

  if (!item || !name) {
    return errorResponse("El nombre es obligatorio.");
  }

  const { id } = await params;
  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
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

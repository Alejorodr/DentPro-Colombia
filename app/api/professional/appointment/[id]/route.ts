import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
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
    include: {
      patient: { include: { user: true, allergies: true } },
      timeSlot: true,
      clinicalNotes: { orderBy: { updatedAt: "desc" } },
      prescription: { include: { items: true } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!appointment || appointment.professionalId !== professional.id) {
    return errorResponse("Cita no encontrada.", 404);
  }

  const history = await prisma.appointment.findMany({
    where: {
      patientId: appointment.patientId,
      id: { not: appointment.id },
    },
    include: { timeSlot: true },
    orderBy: { timeSlot: { startAt: "desc" } },
    take: 5,
  });

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      status: appointment.status,
      reason: appointment.reason,
      serviceName: appointment.serviceName,
      startAt: appointment.timeSlot.startAt.toISOString(),
      endAt: appointment.timeSlot.endAt.toISOString(),
    },
    patient: {
      id: appointment.patient.id,
      name: appointment.patient.user.name,
      lastName: appointment.patient.user.lastName,
      email: appointment.patient.user.email,
      patientCode: appointment.patient.patientCode,
      dateOfBirth: appointment.patient.dateOfBirth?.toISOString() ?? null,
      gender: appointment.patient.gender,
      insuranceProvider: appointment.patient.insuranceProvider,
      insuranceStatus: appointment.patient.insuranceStatus,
    },
    allergies: appointment.patient.allergies.map((allergy) => ({
      id: allergy.id,
      substance: allergy.substance,
      severity: allergy.severity,
      notes: allergy.notes,
    })),
    clinicalNotes: appointment.clinicalNotes.map((note) => ({
      id: note.id,
      content: note.content,
      updatedAt: note.updatedAt.toISOString(),
    })),
    prescription: appointment.prescription
      ? {
          id: appointment.prescription.id,
          items: appointment.prescription.items.map((item) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            dosage: item.dosage,
            frequency: item.frequency,
            instructions: item.instructions,
          })),
        }
      : null,
    attachments: appointment.attachments.map((attachment) => ({
      id: attachment.id,
      kind: attachment.kind,
      filename: attachment.filename,
      url: attachment.url,
      dataUrl: attachment.dataUrl,
      createdAt: attachment.createdAt.toISOString(),
    })),
    history: history.map((historyItem) => ({
      id: historyItem.id,
      startAt: historyItem.timeSlot.startAt.toISOString(),
      status: historyItem.status,
      reason: historyItem.reason,
    })),
  });
}

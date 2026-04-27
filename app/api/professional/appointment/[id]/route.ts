import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

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
    select: {
      id: true,
      professionalId: true,
      patientId: true,
      status: true,
      reason: true,
      serviceName: true,
      timeSlot: { select: { startAt: true, endAt: true } },
      patient: {
        select: {
          id: true,
          patientCode: true,
          dateOfBirth: true,
          gender: true,
          insuranceProvider: true,
          insuranceStatus: true,
          user: { select: { name: true, lastName: true, email: true } },
          allergies: { select: { id: true, substance: true, severity: true, notes: true } },
        },
      },
      clinicalNotes: {
        select: { id: true, content: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
      prescription: {
        select: {
          id: true,
          items: {
            select: {
              id: true,
              type: true,
              name: true,
              dosage: true,
              frequency: true,
              instructions: true,
            },
          },
        },
      },
      attachments: {
        select: { id: true, kind: true, filename: true, url: true, dataUrl: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
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
    select: { id: true, status: true, reason: true, timeSlot: { select: { startAt: true } } },
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

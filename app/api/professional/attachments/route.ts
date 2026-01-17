import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { AttachmentKind } from "@prisma/client";

const allowedKinds = new Set<AttachmentKind>([AttachmentKind.XRAY, AttachmentKind.LAB, AttachmentKind.DOCUMENT]);
const professionalAttachmentSchema = z.object({
  kind: z.nativeEnum(AttachmentKind),
  filename: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().max(120).nullable().optional(),
  size: z.number().int().min(0).nullable().optional(),
  url: z.string().trim().max(500).nullable().optional(),
  dataUrl: z.string().trim().max(20000).nullable().optional(),
  appointmentId: z.string().uuid().nullable().optional(),
  patientId: z.string().uuid().nullable().optional(),
});

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const { searchParams } = new URL(request.url);
  const kindParam = searchParams.get("kind") as AttachmentKind | null;
  if (kindParam && !allowedKinds.has(kindParam)) {
    return errorResponse("Tipo de adjunto inválido.");
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
  });

  if (!professional) {
    return NextResponse.json({ attachments: [] });
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      OR: [
        { appointment: { professionalId: professional.id } },
        { patient: { appointments: { some: { professionalId: professional.id } } } },
      ],
      ...(kindParam ? { kind: kindParam } : {}),
    },
    include: { patient: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      url: attachment.url,
      dataUrl: attachment.dataUrl,
      createdAt: attachment.createdAt.toISOString(),
      patient: attachment.patient
        ? {
            id: attachment.patient.id,
            name: attachment.patient.user.name,
            lastName: attachment.patient.user.lastName,
          }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const { data: payload, error } = await parseJson(request, professionalAttachmentSchema);
  if (error) {
    return error;
  }

  if (!allowedKinds.has(payload.kind)) {
    return errorResponse("Datos de adjunto inválidos.");
  }

  if (!payload.url && !payload.dataUrl) {
    return errorResponse("Adjunto sin enlace ni dataUrl.");
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  if (payload.appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
    });
    if (!appointment || appointment.professionalId !== professional.id) {
      return errorResponse("Cita inválida.", 404);
    }
  }

  if (payload.patientId) {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: payload.patientId },
    });
    if (!patient) {
      return errorResponse("Paciente inválido.", 404);
    }
  }

  const attachment = await prisma.attachment.create({
    data: {
      kind: payload.kind,
      filename: payload.filename,
      mimeType: payload.mimeType ?? null,
      size: payload.size ?? null,
      url: payload.url ?? null,
      dataUrl: payload.dataUrl ?? null,
      patientId: payload.patientId ?? null,
      appointmentId: payload.appointmentId ?? null,
    },
  });

  return NextResponse.json({ attachment }, { status: 201 });
}

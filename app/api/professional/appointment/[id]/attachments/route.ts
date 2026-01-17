import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { AttachmentKind } from "@prisma/client";

const allowedKinds = new Set<AttachmentKind>([AttachmentKind.XRAY, AttachmentKind.LAB, AttachmentKind.DOCUMENT]);
const attachmentSchema = z.object({
  kind: z.nativeEnum(AttachmentKind),
  filename: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().max(120).nullable().optional(),
  size: z.number().int().min(0).nullable().optional(),
  url: z.string().trim().max(500).nullable().optional(),
  dataUrl: z.string().trim().max(20000).nullable().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const { data: payload, error } = await parseJson(request, attachmentSchema);
  if (error) {
    return error;
  }

  if (!allowedKinds.has(payload.kind)) {
    return errorResponse("Datos de adjunto inválidos.");
  }

  if (!payload.url && !payload.dataUrl) {
    return errorResponse("Adjunto sin enlace ni dataUrl.");
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

  const attachment = await prisma.attachment.create({
    data: {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      kind: payload.kind,
      filename: payload.filename,
      mimeType: payload.mimeType ?? null,
      size: payload.size ?? null,
      url: payload.url ?? null,
      dataUrl: payload.dataUrl ?? null,
    },
  });

  return NextResponse.json({ attachment });
}

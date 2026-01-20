import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { getRouteFromRequest, getRequestId } from "@/app/api/clinical/_utils";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getProfessionalProfile } from "@/lib/clinical/access";
import {
  CLINICAL_ATTACHMENT_ALLOWED_TYPES,
  CLINICAL_ATTACHMENT_MAX_BYTES,
  buildClinicalAttachmentChecksum,
  buildClinicalAttachmentStorageKey,
  isAllowedClinicalAttachmentType,
  sanitizeClinicalAttachmentFilename,
} from "@/lib/clinical/attachments";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AccessLogAction } from "@prisma/client";

const attachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().refine((value) => isAllowedClinicalAttachmentType(value), {
    message: "Tipo de archivo no permitido.",
  }),
  size: z.number().int().positive().max(CLINICAL_ATTACHMENT_MAX_BYTES),
  visibleToPatient: z.boolean().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { episodeId } = await params;
  const prisma = getPrismaClient();
  const role = sessionResult.user.role;

  if (role === "RECEPCIONISTA") {
    return errorResponse("No autorizado.", 403);
  }

  const episode = await prisma.clinicalEpisode.findFirst({
    where: { id: episodeId, deletedAt: null },
    select: { id: true, patientId: true, professionalId: true, visibleToPatient: true },
  });

  if (!episode) {
    return errorResponse("Episodio no encontrado.", 404);
  }

  if (role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: sessionResult.user.id },
      select: { id: true },
    });
    if (!patient || patient.id !== episode.patientId || !episode.visibleToPatient) {
      return errorResponse("No autorizado.", 403);
    }
  }

  if (role === "PROFESIONAL") {
    const professional = await getProfessionalProfile(prisma, sessionResult.user.id);
    if (!professional || professional.id !== episode.professionalId) {
      return errorResponse("No autorizado.", 403);
    }
  }

  const attachments = await prisma.clinicalAttachment.findMany({
    where: {
      episodeId,
      deletedAt: null,
      ...(role === "PACIENTE" ? { visibleToPatient: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: episode.patientId,
    action: AccessLogAction.VIEW,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId },
  });

  return NextResponse.json({
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
      visibleToPatient: attachment.visibleToPatient,
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const role = sessionResult.user.role;
  if (role !== "ADMINISTRADOR" && role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const { episodeId } = await params;
  const prisma = getPrismaClient();

  const episode = await prisma.clinicalEpisode.findFirst({
    where: { id: episodeId, deletedAt: null },
    select: { id: true, patientId: true, professionalId: true },
  });

  if (!episode) {
    return errorResponse("Episodio no encontrado.", 404);
  }

  if (role === "PROFESIONAL") {
    const professional = await getProfessionalProfile(prisma, sessionResult.user.id);
    if (!professional || professional.id !== episode.professionalId) {
      return errorResponse("No autorizado.", 403);
    }
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return errorResponse("Archivo inválido.", 400);
  }

  const visibleToPatient = formData.get("visibleToPatient") === "true";
  const parsed = attachmentSchema.safeParse({
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    visibleToPatient,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const sanitizedFilename = sanitizeClinicalAttachmentFilename(file.name, file.type);
  const key = buildClinicalAttachmentStorageKey({ episodeId, filename: sanitizedFilename });
  const checksum = await buildClinicalAttachmentChecksum(file);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const attachment = await prisma.clinicalAttachment.create({
    data: {
      episodeId: episode.id,
      patientId: episode.patientId,
      uploadedByUserId: sessionResult.user.id,
      filename: sanitizedFilename,
      mimeType: file.type,
      size: file.size,
      storageKey: key,
      data: fileBuffer,
      checksum,
      visibleToPatient: parsed.data.visibleToPatient ?? false,
    },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: episode.patientId,
    action: AccessLogAction.CREATE,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId, attachmentId: attachment.id, mimeType: file.type },
  });

  return NextResponse.json(
    {
      attachment: {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        createdAt: attachment.createdAt,
        visibleToPatient: attachment.visibleToPatient,
      },
    },
    { status: 201 },
  );
}

export const allowedAttachmentTypes = CLINICAL_ATTACHMENT_ALLOWED_TYPES;

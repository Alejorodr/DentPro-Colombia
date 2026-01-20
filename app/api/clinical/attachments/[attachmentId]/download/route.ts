import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { getRouteFromRequest, getRequestId } from "@/app/api/clinical/_utils";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getProfessionalProfile } from "@/lib/clinical/access";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AccessLogAction } from "@prisma/client";

export async function GET(request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { attachmentId } = await params;
  const prisma = getPrismaClient();
  const role = sessionResult.user.role;

  if (role === "RECEPCIONISTA") {
    return errorResponse("No autorizado.", 403);
  }

  const attachment = await prisma.clinicalAttachment.findFirst({
    where: { id: attachmentId, deletedAt: null },
    include: { episode: true },
  });

  if (!attachment) {
    return errorResponse("Adjunto no encontrado.", 404);
  }

  if (!attachment.data) {
    return errorResponse("Adjunto no disponible.", 410);
  }

  if (role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: sessionResult.user.id },
      select: { id: true },
    });
    if (
      !patient ||
      patient.id !== attachment.patientId ||
      !attachment.visibleToPatient ||
      !attachment.episode.visibleToPatient
    ) {
      return errorResponse("No autorizado.", 403);
    }
  }

  if (role === "PROFESIONAL") {
    const professional = await getProfessionalProfile(prisma, sessionResult.user.id);
    if (!professional || professional.id !== attachment.episode.professionalId) {
      return errorResponse("No autorizado.", 403);
    }
  }

  const safeFilename = attachment.filename.replace(/[\r\n"]/g, "_");
  const contentDisposition = `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(
    safeFilename,
  )}`;

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: attachment.patientId,
    action: AccessLogAction.VIEW,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { attachmentId },
  });

  return new NextResponse(attachment.data, {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": attachment.size.toString(),
      "Content-Disposition": contentDisposition,
      "Cache-Control": "private, no-store",
    },
  });
}

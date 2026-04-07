import { NextResponse } from "next/server";
import { errorResponse } from "@/app/api/_utils/response";
import { getRouteFromRequest, getRequestId } from "@/app/api/clinical/_utils";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AccessLogAction } from "@prisma/client";

export async function DELETE(request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { attachmentId } = await params;
  const prisma = getPrismaClient();
  const role = sessionResult.user.role;

  if (role !== "ADMINISTRADOR" && role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const attachment = await prisma.clinicalAttachment.findFirst({
    where: {
      id: attachmentId,
      deletedAt: null,
      ...(role === "PROFESIONAL" ? { episode: { professional: { userId: sessionResult.user.id } } } : {}),
    },
    include: { episode: true },
  });

  if (!attachment) {
    return errorResponse("Adjunto no encontrado.", 404);
  }

  if (role === "PROFESIONAL") {
    // Acceso del profesional ya acotado en la consulta.
  }

  await prisma.clinicalAttachment.update({
    where: { id: attachment.id },
    data: {
      deletedAt: new Date(),
      deletedByUserId: sessionResult.user.id,
    },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: attachment.patientId,
    action: AccessLogAction.DELETE,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { attachmentId },
  });

  return NextResponse.json({ success: true });
}

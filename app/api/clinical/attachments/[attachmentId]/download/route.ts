import { errorResponse } from "@/app/api/_utils/response";
import { getRouteFromRequest, getRequestId } from "@/app/api/clinical/_utils";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getProfessionalProfile } from "@/lib/clinical/access";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AccessLogAction } from "@prisma/client";
import { get } from "@vercel/blob";

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
    where: {
      id: attachmentId,
      deletedAt: null,
      ...(role === "PACIENTE"
        ? {
            patient: { userId: sessionResult.user.id },
            visibleToPatient: true,
            episode: { visibleToPatient: true },
          }
        : {}),
    },
    select: {
      id: true,
      patientId: true,
      filename: true,
      mimeType: true,
      size: true,
      storageKey: true,
      visibleToPatient: true,
      episode: {
        select: {
          professionalId: true,
          visibleToPatient: true,
        },
      },
    },
  });

  if (!attachment) {
    return errorResponse("Adjunto no encontrado.", 404);
  }

  if (!attachment.storageKey) {
    return errorResponse("Adjunto no disponible.", 410);
  }

  if (role === "PACIENTE") {
    // Acceso del paciente ya acotado en la consulta.
  }

  if (role === "PROFESIONAL") {
    const professional = await getProfessionalProfile(prisma, sessionResult.user.id);
    if (!professional || professional.id !== attachment.episode.professionalId) {
      return errorResponse("No autorizado.", 403);
    }
  }

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: attachment.patientId,
    action: AccessLogAction.VIEW,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { attachmentId },
  });

  const blob = await get(attachment.storageKey, { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return errorResponse("Adjunto no disponible.", 410);
  }

  const headers = new Headers(Array.from(blob.headers.entries()) as [string, string][]);
  headers.set("Content-Type", attachment.mimeType);
  headers.set("Content-Length", attachment.size.toString());
  headers.set("Content-Disposition", `attachment; filename="${attachment.filename.replace(/["\\\r\n]/g, "_")}"`);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(blob.stream, { status: 200, headers });
}

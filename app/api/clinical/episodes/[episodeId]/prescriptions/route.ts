import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getRouteFromRequest, getRequestId } from "@/app/api/clinical/_utils";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getProfessionalProfile } from "@/lib/clinical/access";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AccessLogAction } from "@prisma/client";

const prescriptionSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  issuedAt: z.coerce.date().optional(),
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

  const prescriptions = await prisma.prescription.findMany({
    where: { episodeId, deletedAt: null },
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

  const data = prescriptions.map((prescription) => ({
    id: prescription.id,
    issuedAt: prescription.issuedAt ?? prescription.createdAt,
    content: prescription.content,
  }));

  return NextResponse.json({ prescriptions: data });
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

  const { data: payload, error } = await parseJson(request, prescriptionSchema);
  if (error) {
    return error;
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

  const prescription = await prisma.prescription.create({
    data: {
      episodeId: episode.id,
      professionalId: episode.professionalId,
      patientId: episode.patientId,
      content: { text: payload.content },
      issuedAt: payload.issuedAt ?? new Date(),
    },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: episode.patientId,
    action: AccessLogAction.CREATE,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId, prescriptionId: prescription.id },
  });

  return NextResponse.json({ prescription }, { status: 201 });
}

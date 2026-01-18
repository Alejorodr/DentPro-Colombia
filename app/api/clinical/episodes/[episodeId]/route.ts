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

const episodeUpdateSchema = z.object({
  reason: z.string().trim().min(1).max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  treatmentPlan: z.string().trim().max(4000).optional(),
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
    include: {
      patient: { include: { user: true } },
      professional: { include: { user: true } },
    },
  });

  if (!episode) {
    return errorResponse("Episodio no encontrado.", 404);
  }

  if (role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: sessionResult.user.id },
      select: { id: true },
    });
    if (!patient || episode.patientId !== patient.id || !episode.visibleToPatient) {
      return errorResponse("No autorizado.", 403);
    }
  }

  if (role === "PROFESIONAL") {
    const professional = await getProfessionalProfile(prisma, sessionResult.user.id);
    if (!professional || episode.professionalId !== professional.id) {
      return errorResponse("No autorizado.", 403);
    }
  }

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: episode.patientId,
    action: AccessLogAction.VIEW,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId },
  });

  if (role === "PACIENTE") {
    return NextResponse.json({
      episode: {
        id: episode.id,
        date: episode.date,
        reason: episode.reason,
        diagnosis: episode.diagnosis,
        treatmentPlan: episode.treatmentPlan,
        professionalName: `${episode.professional.user.name} ${episode.professional.user.lastName}`.trim(),
      },
    });
  }

  return NextResponse.json({
    episode: {
      id: episode.id,
      date: episode.date,
      reason: episode.reason,
      notes: episode.notes,
      diagnosis: episode.diagnosis,
      treatmentPlan: episode.treatmentPlan,
      visibleToPatient: episode.visibleToPatient,
      patient: {
        id: episode.patient.id,
        name: episode.patient.user.name,
        lastName: episode.patient.user.lastName,
      },
      professional: {
        id: episode.professional.id,
        name: episode.professional.user.name,
        lastName: episode.professional.user.lastName,
      },
    },
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const role = sessionResult.user.role;
  if (role !== "ADMINISTRADOR" && role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const { data: payload, error } = await parseJson(request, episodeUpdateSchema);
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

  const updated = await prisma.clinicalEpisode.update({
    where: { id: episode.id },
    data: {
      reason: payload.reason ?? undefined,
      notes: payload.notes ?? undefined,
      diagnosis: payload.diagnosis ?? undefined,
      treatmentPlan: payload.treatmentPlan ?? undefined,
      visibleToPatient: payload.visibleToPatient ?? undefined,
      updatedByUserId: sessionResult.user.id,
    },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: episode.patientId,
    action: AccessLogAction.UPDATE,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId },
  });

  return NextResponse.json({ episode: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  if (sessionResult.user.role !== "ADMINISTRADOR") {
    return errorResponse("No autorizado.", 403);
  }

  const { episodeId } = await params;
  const prisma = getPrismaClient();
  const episode = await prisma.clinicalEpisode.findFirst({
    where: { id: episodeId, deletedAt: null },
    select: { id: true, patientId: true },
  });

  if (!episode) {
    return errorResponse("Episodio no encontrado.", 404);
  }

  const deleted = await prisma.clinicalEpisode.update({
    where: { id: episode.id },
    data: {
      deletedAt: new Date(),
      deletedByUserId: sessionResult.user.id,
    },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: episode.patientId,
    action: AccessLogAction.DELETE,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId },
  });

  return NextResponse.json({ episode: deleted });
}

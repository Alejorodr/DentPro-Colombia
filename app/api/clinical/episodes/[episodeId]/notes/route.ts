import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { getRouteFromRequest, getRequestId } from "@/app/api/clinical/_utils";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getProfessionalProfile } from "@/lib/clinical/access";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AccessLogAction, ClinicalNoteType } from "@prisma/client";

const noteSchema = z.object({
  type: z.nativeEnum(ClinicalNoteType).optional(),
  content: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request, { params }: { params: Promise<{ episodeId: string }> }) {
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

  const notes = await prisma.clinicalNote.findMany({
    where: { episodeId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, lastName: true } } },
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
    notes: notes.map((note) => ({
      id: note.id,
      type: note.type,
      content: note.content,
      createdAt: note.createdAt,
      authorName: `${note.author.name} ${note.author.lastName}`.trim(),
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

  const { data: payload, error } = await parseJson(request, noteSchema);
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

  const note = await prisma.clinicalNote.create({
    data: {
      episodeId: episode.id,
      authorUserId: sessionResult.user.id,
      type: payload.type ?? ClinicalNoteType.EVOLUTION,
      content: payload.content.trim(),
    },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId: episode.patientId,
    action: AccessLogAction.CREATE,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId, noteId: note.id },
  });

  return NextResponse.json({ note }, { status: 201 });
}

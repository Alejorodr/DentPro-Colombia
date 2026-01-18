import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { getPaginationParams, buildPaginatedResponse } from "@/app/api/_utils/pagination";
import { parseJson } from "@/app/api/_utils/validation";
import { getRouteFromRequest, getRequestId } from "@/app/api/clinical/_utils";
import { logClinicalAccess } from "@/lib/clinical/access-log";
import { getProfessionalProfile, professionalHasPatientAccess } from "@/lib/clinical/access";
import { getPrismaClient } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { AccessLogAction } from "@prisma/client";

const episodeCreateSchema = z.object({
  date: z.coerce.date().optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  treatmentPlan: z.string().trim().max(4000).optional(),
  appointmentId: z.string().uuid().optional(),
  visibleToPatient: z.boolean().optional(),
  professionalId: z.string().uuid().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const { patientId } = await params;
  const prisma = getPrismaClient();
  const role = sessionResult.user.role;

  if (role === "RECEPCIONISTA") {
    return errorResponse("No autorizado.", 403);
  }

  if (role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: sessionResult.user.id },
      select: { id: true },
    });
    if (!patient || patient.id !== patientId) {
      return errorResponse("No autorizado.", 403);
    }
  }

  if (role === "PROFESIONAL") {
    const professional = await getProfessionalProfile(prisma, sessionResult.user.id);
    if (!professional) {
      return errorResponse("Profesional no encontrado.", 404);
    }
    const allowed = await professionalHasPatientAccess(prisma, professional, patientId);
    if (!allowed) {
      return errorResponse("No autorizado.", 403);
    }
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const where = {
    patientId,
    deletedAt: null as Date | null,
    ...(role === "PACIENTE" ? { visibleToPatient: true } : {}),
  };

  const [episodes, total] = await Promise.all([
    prisma.clinicalEpisode.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      include: {
        professional: { select: { id: true, user: { select: { name: true, lastName: true } } } },
      },
    }),
    prisma.clinicalEpisode.count({ where }),
  ]);

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId,
    action: AccessLogAction.VIEW,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { page, pageSize },
  });

  const data = episodes.map((episode) => {
    const professionalName = `${episode.professional.user.name} ${episode.professional.user.lastName}`.trim();

    if (role === "PACIENTE") {
      return {
        id: episode.id,
        date: episode.date,
        reason: episode.reason,
        diagnosis: episode.diagnosis,
        treatmentPlan: episode.treatmentPlan,
        professionalName,
      };
    }

    return {
      id: episode.id,
      date: episode.date,
      reason: episode.reason,
      notes: episode.notes,
      diagnosis: episode.diagnosis,
      treatmentPlan: episode.treatmentPlan,
      visibleToPatient: episode.visibleToPatient,
      professionalName,
    };
  });

  return NextResponse.json(buildPaginatedResponse(data, page, pageSize, total));
}

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const role = sessionResult.user.role;
  if (role !== "ADMINISTRADOR" && role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const { data: payload, error } = await parseJson(request, episodeCreateSchema);
  if (error) {
    return error;
  }

  const { patientId } = await params;
  const prisma = getPrismaClient();
  let professionalId = payload.professionalId;

  if (role === "PROFESIONAL") {
    const professional = await getProfessionalProfile(prisma, sessionResult.user.id);
    if (!professional) {
      return errorResponse("Profesional no encontrado.", 404);
    }
    professionalId = professional.id;

    const allowed = await professionalHasPatientAccess(prisma, professional, patientId);
    if (!allowed && !payload.appointmentId) {
      return errorResponse("No autorizado.", 403);
    }
  }

  if (payload.appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
      select: { id: true, patientId: true, professionalId: true },
    });
    if (!appointment || appointment.patientId !== patientId) {
      return errorResponse("Cita inválida.", 404);
    }
    if (professionalId && appointment.professionalId !== professionalId) {
      return errorResponse("No autorizado.", 403);
    }
    professionalId = appointment.professionalId;
  }

  if (!professionalId) {
    return errorResponse("Profesional obligatorio.", 400);
  }

  const episode = await prisma.clinicalEpisode.create({
    data: {
      patientId,
      professionalId,
      appointmentId: payload.appointmentId ?? null,
      date: payload.date ?? new Date(),
      reason: payload.reason ?? null,
      notes: payload.notes ?? null,
      diagnosis: payload.diagnosis ?? null,
      treatmentPlan: payload.treatmentPlan ?? null,
      visibleToPatient: payload.visibleToPatient ?? false,
      createdByUserId: sessionResult.user.id,
      updatedByUserId: sessionResult.user.id,
    },
  });

  await logClinicalAccess({
    userId: sessionResult.user.id,
    patientId,
    action: AccessLogAction.CREATE,
    route: getRouteFromRequest(request),
    requestId: getRequestId(request),
    metadata: { episodeId: episode.id },
  });

  return NextResponse.json({ episode }, { status: 201 });
}

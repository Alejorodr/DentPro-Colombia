import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { refreshFutureInventoryForProfessional } from "@/lib/scheduling/slot-inventory";

const timeRegex = /^\d{2}:\d{2}$/;

const createAssignmentSchema = z.object({
  type: z.literal("createAssignment"),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  onlineBookable: z.boolean().optional(),
  appointmentDurationMinutes: z.number().int().min(5).max(300).optional().nullable(),
  bufferBeforeMinutes: z.number().int().min(0).max(180).optional().nullable(),
  bufferAfterMinutes: z.number().int().min(0).max(180).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const updateAssignmentSchema = z.object({
  type: z.literal("updateAssignment"),
  assignmentId: z.string().uuid(),
  active: z.boolean().optional(),
  onlineBookable: z.boolean().optional(),
  appointmentDurationMinutes: z.number().int().min(5).max(300).optional().nullable(),
  bufferBeforeMinutes: z.number().int().min(0).max(180).optional().nullable(),
  bufferAfterMinutes: z.number().int().min(0).max(180).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const deactivateAssignmentSchema = z.object({
  type: z.literal("deactivateAssignment"),
  assignmentId: z.string().uuid(),
});

const createScheduleSchema = z.object({
  type: z.literal("createSchedule"),
  professionalId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  timezone: z.string().trim().min(3).max(120).optional(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const updateScheduleSchema = z.object({
  type: z.literal("updateSchedule"),
  scheduleId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  timezone: z.string().trim().min(3).max(120).optional(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const deleteScheduleSchema = z.object({
  type: z.literal("deleteSchedule"),
  scheduleId: z.string().uuid(),
});

const reviewAdjustmentSchema = z.object({
  type: z.literal("reviewAdjustment"),
  adjustmentId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional().nullable(),
});

const reviewUnavailabilitySchema = z.object({
  type: z.literal("reviewUnavailability"),
  entryId: z.string().uuid(),
  action: z.enum(["approve", "reject", "cancel"]),
  note: z.string().trim().max(500).optional().nullable(),
});

const legacyAssignServiceSchema = createAssignmentSchema.extend({
  type: z.literal("assignService"),
  active: z.boolean().optional(),
});

const legacyUpsertScheduleSchema = createScheduleSchema.extend({
  type: z.literal("upsertWorkingSchedule"),
});

const bodySchema = z.union([
  createAssignmentSchema,
  updateAssignmentSchema,
  deactivateAssignmentSchema,
  createScheduleSchema,
  updateScheduleSchema,
  deleteScheduleSchema,
  reviewAdjustmentSchema,
  reviewUnavailabilitySchema,
  legacyAssignServiceSchema,
  legacyUpsertScheduleSchema,
]);

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function hasTimeRangeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(endA) > toMinutes(startB);
}



function getDefaultRefreshRange() {
  const rangeStart = new Date();
  rangeStart.setMinutes(0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 45);
  return { rangeStart, rangeEnd };
}

function dateRangesOverlap(
  first: { effectiveFrom: Date | null; effectiveTo: Date | null },
  second: { effectiveFrom: Date | null; effectiveTo: Date | null },
): boolean {
  const firstFrom = first.effectiveFrom?.getTime() ?? Number.NEGATIVE_INFINITY;
  const firstTo = first.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  const secondFrom = second.effectiveFrom?.getTime() ?? Number.NEGATIVE_INFINITY;
  const secondTo = second.effectiveTo?.getTime() ?? Number.POSITIVE_INFINITY;
  return firstFrom <= secondTo && secondFrom <= firstTo;
}

async function ensureActiveProfessional(professionalId: string) {
  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { id: true, active: true, user: { select: { role: true } } },
  });

  if (!professional || !professional.active || professional.user.role !== "PROFESIONAL") {
    return null;
  }

  return professional;
}

async function ensureServiceExists(serviceId: string) {
  const prisma = getPrismaClient();
  return prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  });
}

async function ensureNoScheduleOverlap(params: {
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  excludeScheduleId?: string;
}) {
  const prisma = getPrismaClient();
  const existing = await prisma.professionalWorkingSchedule.findMany({
    where: {
      professionalId: params.professionalId,
      dayOfWeek: params.dayOfWeek,
      active: true,
      ...(params.excludeScheduleId ? { id: { not: params.excludeScheduleId } } : {}),
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
  });

  return existing.some((item) => {
    if (!hasTimeRangeOverlap(params.startTime, params.endTime, item.startTime, item.endTime)) {
      return false;
    }

    return dateRangesOverlap(
      {
        effectiveFrom: params.effectiveFrom,
        effectiveTo: params.effectiveTo,
      },
      {
        effectiveFrom: item.effectiveFrom,
        effectiveTo: item.effectiveTo,
      },
    );
  });
}

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No autorizado.", roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const professionalId = searchParams.get("professionalId")?.trim();

  const prisma = getPrismaClient();
  const where = professionalId ? { professionalId } : undefined;
  const [assignments, schedules, adjustments, unavailability] = await Promise.all([
    prisma.professionalService.findMany({
      where,
      select: {
        id: true,
        professionalId: true,
        serviceId: true,
        active: true,
        onlineBookable: true,
        appointmentDurationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        service: { select: { id: true, name: true, active: true } },
        professional: { select: { id: true, user: { select: { name: true, lastName: true } } } },
      },
      orderBy: [{ professional: { user: { name: "asc" } } }, { service: { name: "asc" } }],
    }),
    prisma.professionalWorkingSchedule.findMany({
      where,
      select: {
        id: true,
        professionalId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        timezone: true,
        effectiveFrom: true,
        effectiveTo: true,
        active: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        professional: { select: { id: true, user: { select: { name: true, lastName: true } } } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.professionalScheduleAdjustment.findMany({
      where,
      select: {
        id: true,
        professionalId: true,
        scheduleId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        effectiveFrom: true,
        effectiveTo: true,
        status: true,
        note: true,
        createdAt: true,
        professional: { select: { id: true, user: { select: { name: true, lastName: true } } } },
        reviewedByUser: { select: { id: true, name: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.professionalUnavailability.findMany({
      where,
      select: {
        id: true,
        professionalId: true,
        type: true,
        status: true,
        startsAt: true,
        endsAt: true,
        reason: true,
        notes: true,
        createdAt: true,
        professional: { select: { id: true, user: { select: { name: true, lastName: true } } } },
        approvedByUser: { select: { id: true, name: true, lastName: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ assignments, schedules, adjustments, unavailability });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No autorizado.", roleError.status);
  }

  const { data: payload, error } = await parseJson(request, bodySchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();

  if (payload.type === "createAssignment" || payload.type === "assignService") {
    const professional = await ensureActiveProfessional(payload.professionalId);
    if (!professional) {
      return errorResponse("El profesional no existe o no está activo.", 400);
    }

    const service = await ensureServiceExists(payload.serviceId);
    if (!service) {
      return errorResponse("El servicio no existe.", 400);
    }

    try {
      const assignment = await prisma.professionalService.create({
        data: {
          professionalId: payload.professionalId,
          serviceId: payload.serviceId,
          active: "active" in payload ? payload.active ?? true : true,
          onlineBookable: payload.onlineBookable ?? true,
          appointmentDurationMinutes: payload.appointmentDurationMinutes ?? null,
          bufferBeforeMinutes: payload.bufferBeforeMinutes ?? null,
          bufferAfterMinutes: payload.bufferAfterMinutes ?? null,
          notes: payload.notes ?? null,
        },
      });

      const { rangeStart, rangeEnd } = getDefaultRefreshRange();
      await refreshFutureInventoryForProfessional({
        professionalId: payload.professionalId,
        rangeStart,
        rangeEnd,
        prisma,
      });

      return NextResponse.json({ assignment }, { status: 201 });
    } catch (createError) {
      if ((createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === "P2002") || (typeof createError === "object" && createError !== null && "code" in createError && (createError as { code?: string }).code === "P2002")) {
        return errorResponse("La asignación profesional-servicio ya existe.", 409);
      }
      throw createError;
    }
  }

  if (payload.type === "updateAssignment") {
    const assignment = await prisma.professionalService.findUnique({ where: { id: payload.assignmentId } });
    if (!assignment) {
      return errorResponse("Asignación no encontrada.", 404);
    }

    const updated = await prisma.professionalService.update({
      where: { id: payload.assignmentId },
      data: {
        active: payload.active,
        onlineBookable: payload.onlineBookable,
        appointmentDurationMinutes: payload.appointmentDurationMinutes,
        bufferBeforeMinutes: payload.bufferBeforeMinutes,
        bufferAfterMinutes: payload.bufferAfterMinutes,
        notes: payload.notes,
      },
    });

    const { rangeStart, rangeEnd } = getDefaultRefreshRange();
    await refreshFutureInventoryForProfessional({
      professionalId: assignment.professionalId,
      rangeStart,
      rangeEnd,
      prisma,
    });

    return NextResponse.json({ assignment: updated });
  }

  if (payload.type === "reviewAdjustment") {
    const adjustment = await prisma.professionalScheduleAdjustment.findUnique({
      where: { id: payload.adjustmentId },
      select: { id: true, professionalId: true },
    });

    if (!adjustment) {
      return errorResponse("Solicitud de ajuste no encontrada.", 404);
    }

    const status = payload.action === "approve" ? "CONFIRMED" : "PENDING_CONFIRMATION";
    const updated = await prisma.professionalScheduleAdjustment.update({
      where: { id: payload.adjustmentId },
      data: {
        status,
        reviewedByUserId: sessionResult.user.id,
        note: payload.note ?? undefined,
      },
    });

    const { rangeStart, rangeEnd } = getDefaultRefreshRange();
    await refreshFutureInventoryForProfessional({
      professionalId: adjustment.professionalId,
      rangeStart,
      rangeEnd,
      prisma,
    });

    return NextResponse.json({ adjustment: updated });
  }

  if (payload.type === "reviewUnavailability") {
    const entry = await prisma.professionalUnavailability.findUnique({
      where: { id: payload.entryId },
      select: { id: true, professionalId: true },
    });

    if (!entry) {
      return errorResponse("Novedad no encontrada.", 404);
    }

    const status = payload.action === "approve"
      ? "APPROVED"
      : payload.action === "reject"
        ? "REJECTED"
        : "CANCELLED";

    const updated = await prisma.professionalUnavailability.update({
      where: { id: payload.entryId },
      data: {
        status,
        approvedByUserId: payload.action === "approve" ? sessionResult.user.id : undefined,
        updatedByUserId: sessionResult.user.id,
        internalNotes: payload.note ?? undefined,
      },
    });

    const { rangeStart, rangeEnd } = getDefaultRefreshRange();
    await refreshFutureInventoryForProfessional({
      professionalId: entry.professionalId,
      rangeStart,
      rangeEnd,
      prisma,
    });

    return NextResponse.json({ entry: updated });
  }

  if (payload.type === "deactivateAssignment") {
    const assignment = await prisma.professionalService.findUnique({ where: { id: payload.assignmentId } });
    if (!assignment) {
      return errorResponse("Asignación no encontrada.", 404);
    }

    const updated = await prisma.professionalService.update({
      where: { id: payload.assignmentId },
      data: { active: false, onlineBookable: false },
    });

    const { rangeStart, rangeEnd } = getDefaultRefreshRange();
    await refreshFutureInventoryForProfessional({
      professionalId: assignment.professionalId,
      rangeStart,
      rangeEnd,
      prisma,
    });

    return NextResponse.json({ assignment: updated });
  }

  if (payload.type === "createSchedule" || payload.type === "upsertWorkingSchedule") {
    if (toMinutes(payload.endTime) <= toMinutes(payload.startTime)) {
      return errorResponse("El horario base es inválido: la hora de fin debe ser posterior a la hora de inicio.", 400);
    }

    const effectiveFrom = payload.effectiveFrom ? new Date(payload.effectiveFrom) : null;
    const effectiveTo = payload.effectiveTo ? new Date(payload.effectiveTo) : null;

    if (effectiveFrom && effectiveTo && effectiveTo <= effectiveFrom) {
      return errorResponse("La vigencia del horario es inválida.", 400);
    }

    const professional = await ensureActiveProfessional(payload.professionalId);
    if (!professional) {
      return errorResponse("El profesional no existe o no está activo.", 400);
    }

    const hasOverlap = await ensureNoScheduleOverlap({
      professionalId: payload.professionalId,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      effectiveFrom,
      effectiveTo,
    });

    if (hasOverlap) {
      return errorResponse("El bloque de horario se superpone con otro horario activo del profesional.", 409);
    }

    const schedule = await prisma.professionalWorkingSchedule.create({
      data: {
        professionalId: payload.professionalId,
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        timezone: payload.timezone ?? "America/Bogota",
        effectiveFrom,
        effectiveTo,
        active: payload.active ?? true,
        notes: payload.notes ?? null,
        status: "CONFIRMED",
        createdByUserId: sessionResult.user.id,
      },
    });

    const { rangeStart, rangeEnd } = getDefaultRefreshRange();
    await refreshFutureInventoryForProfessional({
      professionalId: payload.professionalId,
      rangeStart,
      rangeEnd,
      prisma,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  }

  if (payload.type === "updateSchedule") {
    const schedule = await prisma.professionalWorkingSchedule.findUnique({ where: { id: payload.scheduleId } });
    if (!schedule) {
      return errorResponse("Horario no encontrado.", 404);
    }

    const nextDay = payload.dayOfWeek ?? schedule.dayOfWeek;
    const nextStart = payload.startTime ?? schedule.startTime;
    const nextEnd = payload.endTime ?? schedule.endTime;
    const nextEffectiveFrom = payload.effectiveFrom ? new Date(payload.effectiveFrom) : payload.effectiveFrom === null ? null : schedule.effectiveFrom;
    const nextEffectiveTo = payload.effectiveTo ? new Date(payload.effectiveTo) : payload.effectiveTo === null ? null : schedule.effectiveTo;

    if (toMinutes(nextEnd) <= toMinutes(nextStart)) {
      return errorResponse("El horario base es inválido: la hora de fin debe ser posterior a la hora de inicio.", 400);
    }

    if (nextEffectiveFrom && nextEffectiveTo && nextEffectiveTo <= nextEffectiveFrom) {
      return errorResponse("La vigencia del horario es inválida.", 400);
    }

    const hasOverlap = await ensureNoScheduleOverlap({
      professionalId: schedule.professionalId,
      dayOfWeek: nextDay,
      startTime: nextStart,
      endTime: nextEnd,
      effectiveFrom: nextEffectiveFrom,
      effectiveTo: nextEffectiveTo,
      excludeScheduleId: schedule.id,
    });

    if (hasOverlap) {
      return errorResponse("El bloque de horario se superpone con otro horario activo del profesional.", 409);
    }

    const updated = await prisma.professionalWorkingSchedule.update({
      where: { id: payload.scheduleId },
      data: {
        dayOfWeek: payload.dayOfWeek,
        startTime: payload.startTime,
        endTime: payload.endTime,
        timezone: payload.timezone,
        effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : payload.effectiveFrom === null ? null : undefined,
        effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : payload.effectiveTo === null ? null : undefined,
        active: payload.active,
        notes: payload.notes,
        status: "CONFIRMED",
      },
    });

    const { rangeStart, rangeEnd } = getDefaultRefreshRange();
    await refreshFutureInventoryForProfessional({
      professionalId: schedule.professionalId,
      rangeStart,
      rangeEnd,
      prisma,
    });

    return NextResponse.json({ schedule: updated });
  }

  const schedule = await prisma.professionalWorkingSchedule.findUnique({ where: { id: payload.scheduleId } });
  if (!schedule) {
    return errorResponse("Horario no encontrado.", 404);
  }

  const updated = await prisma.professionalWorkingSchedule.update({
    where: { id: payload.scheduleId },
    data: { active: false },
  });

  const { rangeStart, rangeEnd } = getDefaultRefreshRange();
  await refreshFutureInventoryForProfessional({
    professionalId: schedule.professionalId,
    rangeStart,
    rangeEnd,
    prisma,
  });

  return NextResponse.json({ schedule: updated });
}

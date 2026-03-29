import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";
import { refreshFutureInventoryForProfessional } from "@/lib/scheduling/slot-inventory";

const bodySchema = z.union([
  z.object({
    type: z.literal("confirmSchedule"),
    scheduleIds: z.array(z.string().uuid()).min(1),
  }),
  z.object({
    type: z.literal("requestAdjustment"),
    scheduleId: z.string().uuid().optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  }),
  z.object({
    type: z.literal("createUnavailability"),
    entryType: z.enum([
      "VACATION",
      "SICK_LEAVE",
      "TRAINING",
      "ADMIN_TIME",
      "PERSONAL_LEAVE",
      "INTERNAL_BLOCK",
      "OTHER",
    ]),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    fullDay: z.boolean().optional(),
    reason: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    internalNotes: z.string().trim().max(500).optional().nullable(),
  }),
]);

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  const [baselineSchedules, adjustments, unavailability] = await Promise.all([
    prisma.professionalWorkingSchedule.findMany({
      where: { professionalId: professional.id, active: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.professionalScheduleAdjustment.findMany({
      where: { professionalId: professional.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.professionalUnavailability.findMany({
      where: { professionalId: professional.id },
      orderBy: { startsAt: "asc" },
      take: 60,
    }),
  ]);

  return NextResponse.json({ baselineSchedules, adjustments, unavailability });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, bodySchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({ where: { userId: sessionResult.user.id } });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  if (payload.type === "confirmSchedule") {
    const result = await prisma.professionalWorkingSchedule.updateMany({
      where: {
        id: { in: payload.scheduleIds },
        professionalId: professional.id,
      },
      data: {
        status: "CONFIRMED",
      },
    });
    const rangeStart = new Date();
    rangeStart.setMinutes(0, 0, 0);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 45);
    await refreshFutureInventoryForProfessional({
      professionalId: professional.id,
      rangeStart,
      rangeEnd,
      prisma,
    });

    return NextResponse.json({ updated: result.count });
  }

  if (payload.type === "requestAdjustment") {
    const adjustment = await prisma.professionalScheduleAdjustment.create({
      data: {
        professionalId: professional.id,
        scheduleId: payload.scheduleId ?? null,
        dayOfWeek: payload.dayOfWeek ?? null,
        startTime: payload.startTime ?? null,
        endTime: payload.endTime ?? null,
        effectiveFrom: new Date(payload.effectiveFrom),
        effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : null,
        note: payload.note ?? null,
        requestedByUserId: sessionResult.user.id,
        status: "CHANGES_REQUESTED",
      },
    });

    return NextResponse.json({ adjustment }, { status: 201 });
  }

  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);
  if (startsAt >= endsAt) {
    return errorResponse("Rango de tiempo inválido.", 400);
  }

  const overlapping = await prisma.professionalUnavailability.findFirst({
    where: {
      professionalId: professional.id,
      status: { in: ["PENDING", "APPROVED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
    select: { id: true },
  });
  if (overlapping) {
    return errorResponse("Ya existe una novedad que se superpone con este rango.", 409);
  }

  const entry = await prisma.professionalUnavailability.create({
    data: {
      professionalId: professional.id,
      type: payload.entryType,
      startsAt,
      endsAt,
      fullDay: payload.fullDay ?? false,
      reason: payload.reason ?? payload.notes ?? null,
      notes: payload.notes ?? payload.reason ?? null,
      internalNotes: payload.internalNotes ?? null,
      status: "PENDING",
      createdByUserId: sessionResult.user.id,
      updatedByUserId: sessionResult.user.id,
    },
  });

  const rangeStart = startsAt > new Date() ? startsAt : new Date();
  rangeStart.setMinutes(0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 45);
  await refreshFutureInventoryForProfessional({
    professionalId: professional.id,
    rangeStart,
    rangeEnd,
    prisma,
  });

  return NextResponse.json({ entry }, { status: 201 });
}

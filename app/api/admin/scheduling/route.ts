import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

const assignServiceSchema = z.object({
  type: z.literal("assignService"),
  professionalId: z.string().uuid(),
  serviceId: z.string().uuid(),
  active: z.boolean().optional(),
  onlineBookable: z.boolean().optional(),
  appointmentDurationMinutes: z.number().int().min(5).max(300).optional().nullable(),
  bufferBeforeMinutes: z.number().int().min(0).max(180).optional().nullable(),
  bufferAfterMinutes: z.number().int().min(0).max(180).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const scheduleSchema = z.object({
  type: z.literal("upsertWorkingSchedule"),
  professionalId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().trim().min(3).max(120).optional(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const bodySchema = z.union([assignServiceSchema, scheduleSchema]);

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No autorizado.", roleError.status);
  }

  const prisma = getPrismaClient();
  const [assignments, schedules] = await Promise.all([
    prisma.professionalService.findMany({
      include: {
        service: { select: { id: true, name: true, active: true } },
        professional: { include: { user: true } },
      },
      orderBy: [{ professional: { user: { name: "asc" } } }, { service: { name: "asc" } }],
    }),
    prisma.professionalWorkingSchedule.findMany({
      include: {
        professional: { include: { user: true } },
      },
      orderBy: [{ professional: { user: { name: "asc" } } }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return NextResponse.json({ assignments, schedules });
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

  if (payload.type === "assignService") {
    const assignment = await prisma.professionalService.upsert({
      where: { professionalId_serviceId: { professionalId: payload.professionalId, serviceId: payload.serviceId } },
      update: {
        active: payload.active ?? true,
        onlineBookable: payload.onlineBookable ?? true,
        appointmentDurationMinutes: payload.appointmentDurationMinutes ?? null,
        bufferBeforeMinutes: payload.bufferBeforeMinutes ?? null,
        bufferAfterMinutes: payload.bufferAfterMinutes ?? null,
        notes: payload.notes ?? null,
      },
      create: {
        professionalId: payload.professionalId,
        serviceId: payload.serviceId,
        active: payload.active ?? true,
        onlineBookable: payload.onlineBookable ?? true,
        appointmentDurationMinutes: payload.appointmentDurationMinutes ?? null,
        bufferBeforeMinutes: payload.bufferBeforeMinutes ?? null,
        bufferAfterMinutes: payload.bufferAfterMinutes ?? null,
        notes: payload.notes ?? null,
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  }

  const schedule = await prisma.professionalWorkingSchedule.create({
    data: {
      professionalId: payload.professionalId,
      dayOfWeek: payload.dayOfWeek,
      startTime: payload.startTime,
      endTime: payload.endTime,
      timezone: payload.timezone ?? "America/Bogota",
      effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : null,
      effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : null,
      active: payload.active ?? true,
      notes: payload.notes ?? null,
      status: "PENDING_CONFIRMATION",
      createdByUserId: sessionResult.user.id,
    },
  });

  return NextResponse.json({ schedule }, { status: 201 });
}

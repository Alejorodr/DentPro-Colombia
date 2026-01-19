import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { expandAvailability } from "@/lib/availability";
import { getPrismaClient } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/authz";

const availabilitySchema = z.union([
  z.object({
    type: z.literal("rule"),
    rrule: z.string().trim().min(1),
    startTime: z.string().trim().min(1),
    endTime: z.string().trim().min(1),
    timezone: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("exception"),
    date: z.string().trim().min(1),
    isAvailable: z.boolean().optional(),
    startTime: z.string().trim().optional(),
    endTime: z.string().trim().optional(),
    reason: z.string().trim().max(200).optional(),
  }),
  z.object({
    type: z.literal("block"),
    startAt: z.string().trim().min(1),
    endAt: z.string().trim().min(1),
    reason: z.string().trim().max(200).optional(),
  }),
]);

function getRangeFromQuery(rangeParam: string | null) {
  const days = Math.min(Number(rangeParam ?? "30"), 60);
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  return { start, end };
}

export async function GET(request: Request) {
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
    include: { availabilityRules: true, availabilityExceptions: true, availabilityBlocks: true },
  });

  if (!professional) {
    return NextResponse.json({ rules: [], exceptions: [], slots: [] });
  }

  const { searchParams } = new URL(request.url);
  const { start, end } = getRangeFromQuery(searchParams.get("range"));
  const clinicHolidays = await prisma.clinicHoliday.findMany();

  const slots = expandAvailability(
    professional.availabilityRules.filter((rule) => rule.active),
    professional.availabilityExceptions,
    professional.availabilityBlocks,
    clinicHolidays,
    start,
    end,
  );

  return NextResponse.json({
    rules: professional.availabilityRules,
    exceptions: professional.availabilityExceptions,
    blocks: professional.availabilityBlocks,
    holidays: clinicHolidays,
    slots: slots.map((slot) => ({
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      ruleId: slot.ruleId,
    })),
  });
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

  const { data: payload, error } = await parseJson(request, availabilitySchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  if (payload.type === "rule") {
    const rule = await prisma.availabilityRule.create({
      data: {
        professionalId: professional.id,
        rrule: payload.rrule,
        startTime: payload.startTime,
        endTime: payload.endTime,
        timezone: payload.timezone,
        active: true,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  }

  if (payload.type === "block") {
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
      return errorResponse("Rango inválido para el bloqueo.");
    }

    const overlapping = await prisma.availabilityBlock.findFirst({
      where: {
        professionalId: professional.id,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });

    if (overlapping) {
      return errorResponse("El bloqueo se solapa con uno existente.", 409);
    }

    const block = await prisma.availabilityBlock.create({
      data: {
        professionalId: professional.id,
        startAt,
        endAt,
        reason: payload.reason ?? null,
      },
    });

    return NextResponse.json({ block }, { status: 201 });
  }

  if (!payload.date) {
    return errorResponse("Fecha inválida.");
  }

  const exceptionDate = new Date(`${payload.date}T00:00:00`);
  const existingException = await prisma.availabilityException.findFirst({
    where: { professionalId: professional.id, date: exceptionDate },
  });
  if (existingException) {
    return errorResponse("Ya existe una excepción para esa fecha.", 409);
  }

  const exception = await prisma.availabilityException.create({
    data: {
      professionalId: professional.id,
      date: exceptionDate,
      isAvailable: Boolean(payload.isAvailable),
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
      reason: payload.reason || null,
    },
  });

  return NextResponse.json({ exception }, { status: 201 });
}

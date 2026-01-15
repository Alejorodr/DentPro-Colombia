import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { expandAvailability } from "@/lib/availability";
import { getPrismaClient } from "@/lib/prisma";

function getRangeFromQuery(rangeParam: string | null) {
  const days = Math.min(Number(rangeParam ?? "30"), 60);
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  return { start, end };
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
    include: { availabilityRules: true, availabilityExceptions: true },
  });

  if (!professional) {
    return NextResponse.json({ rules: [], exceptions: [], slots: [] });
  }

  const { searchParams } = new URL(request.url);
  const { start, end } = getRangeFromQuery(searchParams.get("range"));

  const slots = expandAvailability(
    professional.availabilityRules.filter((rule) => rule.active),
    professional.availabilityExceptions,
    start,
    end,
  );

  return NextResponse.json({
    rules: professional.availabilityRules,
    exceptions: professional.availabilityExceptions,
    slots: slots.map((slot) => ({
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      ruleId: slot.ruleId,
    })),
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        type?: "rule" | "exception";
        rrule?: string;
        startTime?: string;
        endTime?: string;
        timezone?: string;
        date?: string;
        isAvailable?: boolean;
        reason?: string;
      }
    | null;

  if (!payload?.type) {
    return errorResponse("Tipo de disponibilidad inválido.");
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
  });

  if (!professional) {
    return errorResponse("Profesional no encontrado.", 404);
  }

  if (payload.type === "rule") {
    if (!payload.rrule || !payload.startTime || !payload.endTime || !payload.timezone) {
      return errorResponse("Datos incompletos para regla.");
    }

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

  if (!payload.date) {
    return errorResponse("Fecha inválida.");
  }

  const exception = await prisma.availabilityException.create({
    data: {
      professionalId: professional.id,
      date: new Date(`${payload.date}T00:00:00`),
      isAvailable: Boolean(payload.isAvailable),
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
      reason: payload.reason || null,
    },
  });

  return NextResponse.json({ exception }, { status: 201 });
}

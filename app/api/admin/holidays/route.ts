import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { requireRole, requireSession } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

const holidaySchema = z.object({
  date: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
});

export async function GET() {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const holidays = await prisma.clinicHoliday.findMany({
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ holidays });
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, holidaySchema);
  if (error) {
    return error;
  }

  const date = new Date(`${payload.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return errorResponse("Fecha inválida.");
  }

  const prisma = getPrismaClient();
  const existing = await prisma.clinicHoliday.findFirst({ where: { date } });
  if (existing) {
    return errorResponse("El feriado ya existe.", 409);
  }

  const holiday = await prisma.clinicHoliday.create({
    data: {
      date,
      name: payload.name.trim(),
    },
  });

  return NextResponse.json({ holiday }, { status: 201 });
}

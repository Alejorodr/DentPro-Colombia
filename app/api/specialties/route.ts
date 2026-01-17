import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";

const specialtySchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultSlotDurationMinutes: z.number().int().min(1).max(240),
  active: z.boolean().optional(),
});

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const prisma = getPrismaClient();

  const specialties = await prisma.specialty.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(specialties);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para crear especialidades.", 403);
  }

  const { data: payload, error } = await parseJson(request, specialtySchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const specialty = await prisma.specialty.create({
    data: {
      name: payload.name.trim(),
      defaultSlotDurationMinutes: payload.defaultSlotDurationMinutes,
      active: payload.active ?? true,
    },
  });

  return NextResponse.json(specialty, { status: 201 });
}

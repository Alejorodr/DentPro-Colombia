import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";

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

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    defaultSlotDurationMinutes?: number;
    active?: boolean;
  } | null;

  if (!payload?.name?.trim()) {
    return errorResponse("El nombre es obligatorio.");
  }

  const duration = Number(payload.defaultSlotDurationMinutes ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) {
    return errorResponse("La duración debe ser un número válido.");
  }

  const prisma = getPrismaClient();
  const specialty = await prisma.specialty.create({
    data: {
      name: payload.name.trim(),
      defaultSlotDurationMinutes: duration,
      active: payload.active ?? true,
    },
  });

  return NextResponse.json(specialty, { status: 201 });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const prisma = getPrismaClient();
  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const [professionals, total] = await Promise.all([
    prisma.professionalProfile.findMany({
      include: { user: true, specialty: true },
      orderBy: { user: { name: "asc" } },
      skip,
      take,
    }),
    prisma.professionalProfile.count(),
  ]);
  return NextResponse.json(buildPaginatedResponse(professionals, page, pageSize, total));
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para crear profesionales.", 403);
  }

  const payload = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
    lastName?: string;
    specialtyId?: string;
    slotDurationMinutes?: number | null;
  } | null;

  if (!payload?.email?.trim() || !payload.password || !payload.name?.trim() || !payload.lastName?.trim()) {
    return errorResponse("Nombre, apellido, correo y contraseña son obligatorios.");
  }

  if (!payload.specialtyId) {
    return errorResponse("La especialidad es obligatoria.");
  }

  const prisma = getPrismaClient();
  const passwordHash = await bcrypt.hash(payload.password, 10);

  const professional = await prisma.professionalProfile.create({
    data: {
      user: {
        create: {
          email: payload.email.toLowerCase(),
          passwordHash,
          role: Role.PROFESIONAL,
          name: payload.name.trim(),
          lastName: payload.lastName.trim(),
        },
      },
      specialty: { connect: { id: payload.specialtyId } },
      slotDurationMinutes: payload.slotDurationMinutes ?? null,
      active: true,
    },
    include: { user: true, specialty: true },
  });

  return NextResponse.json(professional, { status: 201 });
}

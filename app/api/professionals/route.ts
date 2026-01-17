import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { parseJson } from "@/app/api/_utils/validation";
import { Role } from "@prisma/client";

const createProfessionalSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  specialtyId: z.string().uuid(),
  slotDurationMinutes: z.number().int().min(5).max(240).nullable().optional(),
});

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

  const { data: payload, error } = await parseJson(request, createProfessionalSchema);
  if (error) {
    return error;
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

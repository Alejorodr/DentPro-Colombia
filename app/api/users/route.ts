import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { parseJson } from "@/app/api/_utils/validation";
import { isUserRole, type UserRole } from "@/lib/auth/roles";
import { requireRole, requireSession } from "@/lib/authz";

const createUserSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(200),
  role: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
  documentId: z.string().trim().max(40).optional(),
  specialtyId: z.string().uuid().optional(),
  slotDurationMinutes: z.number().int().min(5).max(240).optional(),
});

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para listar usuarios.", roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const prisma = getPrismaClient();
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { patient: true, professional: { include: { specialty: true } } },
      skip,
      take,
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json(buildPaginatedResponse(users, page, pageSize, total));
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse("No tienes permisos para crear usuarios.", roleError.status);
  }

  const { data: payload, error } = await parseJson(request, createUserSchema);
  if (error) {
    return error;
  }

  const role = (payload.role as UserRole | undefined) ?? "PACIENTE";

  if (!isUserRole(role)) {
    return errorResponse("Rol inválido.");
  }

  if (role === "PROFESIONAL" && !payload.specialtyId) {
    return errorResponse("La especialidad es obligatoria para profesionales.");
  }


  const prisma = getPrismaClient();
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const professionalSpecialtyId = payload.specialtyId;

  const user = await prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      passwordHash,
      role,
      name: payload.name.trim(),
      lastName: payload.lastName.trim(),
      patient: role === "PACIENTE"
        ? {
            create: {
              phone: payload.phone?.trim() || null,
              documentId: payload.documentId?.trim() || null,
              active: true,
            },
          }
        : undefined,
      professional: role === "PROFESIONAL"
        ? {
            create: {
              specialty: { connect: { id: professionalSpecialtyId! } },
              slotDurationMinutes: payload.slotDurationMinutes ?? null,
              active: true,
            },
          }
        : undefined,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";
import { isUserRole, type UserRole } from "@/lib/auth/roles";

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

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR"])) {
    return errorResponse("No tienes permisos para listar usuarios.", 403);
  }

  const prisma = getPrismaClient();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { patient: true, professional: { include: { specialty: true } } },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (!isAuthorized(sessionUser.role, ["ADMINISTRADOR", "RECEPCIONISTA"])) {
    return errorResponse("No tienes permisos para crear usuarios.", 403);
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

  if (sessionUser.role === "RECEPCIONISTA" && role !== "PACIENTE") {
    return errorResponse("Recepción solo puede crear pacientes.", 403);
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

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getPrismaClient } from "@/lib/prisma";
import { getSessionUser, isAuthorized } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { isUserRole, type UserRole } from "@/lib/auth/roles";

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

  const payload = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    role?: UserRole;
    name?: string;
    lastName?: string;
    phone?: string;
    documentId?: string;
    specialtyId?: string;
    slotDurationMinutes?: number;
  } | null;

  if (!payload?.email?.trim() || !payload.password || !payload.name?.trim() || !payload.lastName?.trim()) {
    return errorResponse("Nombre, apellido, correo y contraseña son obligatorios.");
  }

  const role = payload.role ?? "PACIENTE";

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
            },
          }
        : undefined,
      professional: role === "PROFESIONAL"
        ? {
            create: {
              specialtyId: payload.specialtyId,
              slotDurationMinutes: payload.slotDurationMinutes ?? null,
              active: true,
            },
          }
        : undefined,
    },
  });

  return NextResponse.json(user, { status: 201 });
}

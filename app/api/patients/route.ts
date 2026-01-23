import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { parseJson } from "@/app/api/_utils/validation";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/authz";
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from "@/lib/auth/password-policy";

const createPatientSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(200).regex(PASSWORD_POLICY_REGEX, PASSWORD_POLICY_MESSAGE),
  name: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30).optional(),
  documentId: z.string().trim().max(40).optional(),
});

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["RECEPCIONISTA", "ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const activeOnly = searchParams.get("active") === "true";
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const prisma = getPrismaClient();
  const where: Prisma.PatientProfileWhereInput = {
    ...(activeOnly ? { active: true } : {}),
    ...(query
      ? {
          user: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };
  const [patients, total] = await Promise.all([
    prisma.patientProfile.findMany({
      where,
      include: { user: true },
      orderBy: { user: { name: "asc" } },
      skip,
      take,
    }),
    prisma.patientProfile.count({ where }),
  ]);

  return NextResponse.json(buildPaginatedResponse(patients, page, pageSize, total));
}

export async function POST(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["RECEPCIONISTA", "ADMINISTRADOR"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const { data: payload, error } = await parseJson(request, createPatientSchema);
  if (error) {
    return error;
  }

  const prisma = getPrismaClient();
  const passwordHash = await bcrypt.hash(payload.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email: payload.email.toLowerCase(),
        passwordHash,
        role: "PACIENTE",
        name: payload.name.trim(),
        lastName: payload.lastName.trim(),
        patient: {
          create: {
            phone: payload.phone?.trim() || null,
            documentId: payload.documentId?.trim() || null,
            active: true,
          },
        },
      },
      include: { patient: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
      if (target.includes("email")) {
        return errorResponse("El correo ya existe.", 400);
      }
    }
    return errorResponse("No se pudo crear el paciente.");
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { InsuranceStatus } from "@prisma/client";
import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { parseJson } from "@/app/api/_utils/validation";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  documentId: z.string().trim().max(40).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  insuranceProvider: z.string().trim().max(120).optional(),
  insuranceStatus: z.string().trim().max(40).optional(),
  gender: z.string().trim().max(40).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
  patientCode: z.string().trim().max(40).optional(),
  dateOfBirth: z.string().trim().optional(),
});

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      role: true,
      patient: true,
      professional: true,
    },
  });

  if (!user) {
    return errorResponse("Usuario no encontrado.", 404);
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  const { data: payload, error } = await parseJson(request, updateProfileSchema);
  if (error) {
    return error;
  }

  const resolvedInsuranceStatus =
    payload.insuranceStatus && Object.values(InsuranceStatus).includes(payload.insuranceStatus as InsuranceStatus)
      ? (payload.insuranceStatus as InsuranceStatus)
      : null;

  const prisma = getPrismaClient();
  const updated = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      name: payload.name?.trim() ?? undefined,
      lastName: payload.lastName?.trim() ?? undefined,
      email: payload.email?.toLowerCase() ?? undefined,
      patient:
        sessionUser.role === "PACIENTE"
          ? {
              upsert: {
                create: {
                  phone: payload.phone?.trim() || null,
                  documentId: payload.documentId?.trim() || null,
                  address: payload.address?.trim() || null,
                  city: payload.city?.trim() || null,
                  insuranceProvider: payload.insuranceProvider?.trim() || null,
                  insuranceStatus: resolvedInsuranceStatus,
                  gender: payload.gender?.trim() || null,
                  avatarUrl: payload.avatarUrl?.trim() || null,
                  patientCode: payload.patientCode?.trim() || null,
                  dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
                },
                update: {
                  phone: payload.phone?.trim() || undefined,
                  documentId: payload.documentId?.trim() || undefined,
                  address: payload.address?.trim() || undefined,
                  city: payload.city?.trim() || undefined,
                  insuranceProvider: payload.insuranceProvider?.trim() || undefined,
                  insuranceStatus: resolvedInsuranceStatus ?? undefined,
                  gender: payload.gender?.trim() || undefined,
                  avatarUrl: payload.avatarUrl?.trim() || undefined,
                  patientCode: payload.patientCode?.trim() || undefined,
                  dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
                },
              },
            }
          : undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      role: true,
      patient: true,
      professional: true,
    },
  });

  return NextResponse.json(updated);
}

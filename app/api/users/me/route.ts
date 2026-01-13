import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { InsuranceStatus } from "@prisma/client";
import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";

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

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    documentId?: string;
    address?: string;
    city?: string;
    insuranceProvider?: string;
    insuranceStatus?: string;
    gender?: string;
    avatarUrl?: string;
    patientCode?: string;
    dateOfBirth?: string;
  } | null;

  if (!payload) {
    return errorResponse("Solicitud inválida.");
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

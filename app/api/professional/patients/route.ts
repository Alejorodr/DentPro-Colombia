import { NextResponse } from "next/server";

import { errorResponse } from "@/app/api/_utils/response";
import { buildPaginatedResponse, getPaginationParams } from "@/app/api/_utils/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireRole, requireSession } from "@/lib/authz";

export async function GET(request: Request) {
  const sessionResult = await requireSession();
  if ("error" in sessionResult) {
    return errorResponse(sessionResult.error.message, sessionResult.error.status);
  }

  const roleError = requireRole(sessionResult.user, ["PROFESIONAL"]);
  if (roleError) {
    return errorResponse(roleError.message, roleError.status);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionResult.user.id },
  });

  if (!professional) {
    return NextResponse.json({ patients: [] });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const { page, pageSize, skip, take } = getPaginationParams(searchParams);

  const where: Prisma.PatientProfileWhereInput = {
    appointments: { some: { professionalId: professional.id } },
    ...(query
      ? {
          OR: [
            { patientCode: { contains: query, mode: "insensitive" } },
            { user: { name: { contains: query, mode: "insensitive" } } },
            { user: { lastName: { contains: query, mode: "insensitive" } } },
            { user: { email: { contains: query, mode: "insensitive" } } },
          ],
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

  const patientIds = patients.map((patient) => patient.id);
  const lastAppointments = patientIds.length
    ? await prisma.appointment.findMany({
        where: {
          professionalId: professional.id,
          patientId: { in: patientIds },
        },
        include: { timeSlot: true },
        orderBy: { timeSlot: { startAt: "desc" } },
      })
    : [];

  const lastVisitMap = new Map<string, string>();
  for (const appointment of lastAppointments) {
    if (!lastVisitMap.has(appointment.patientId)) {
      lastVisitMap.set(appointment.patientId, appointment.timeSlot.startAt.toISOString());
    }
  }

  const data = patients.map((patient) => ({
    id: patient.id,
    name: patient.user.name,
    lastName: patient.user.lastName,
    email: patient.user.email,
    patientCode: patient.patientCode,
    lastVisit: lastVisitMap.get(patient.id) ?? null,
  }));

  return NextResponse.json(buildPaginatedResponse(data, page, pageSize, total));
}

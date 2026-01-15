import { NextResponse } from "next/server";

import { getSessionUser } from "@/app/api/_utils/auth";
import { errorResponse } from "@/app/api/_utils/response";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return errorResponse("No autorizado.", 401);
  }

  if (sessionUser.role !== "PROFESIONAL") {
    return errorResponse("No autorizado.", 403);
  }

  const prisma = getPrismaClient();
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: sessionUser.id },
  });

  if (!professional) {
    return NextResponse.json({ patients: [] });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: professional.id,
      ...(query
        ? {
            patient: {
              OR: [
                { patientCode: { contains: query, mode: "insensitive" } },
                { user: { name: { contains: query, mode: "insensitive" } } },
                { user: { lastName: { contains: query, mode: "insensitive" } } },
                { user: { email: { contains: query, mode: "insensitive" } } },
              ],
            },
          }
        : {}),
    },
    include: { patient: { include: { user: true } }, timeSlot: true },
    orderBy: { timeSlot: { startAt: "desc" } },
  });

  const patientMap = new Map<string, {
    id: string;
    name: string;
    lastName: string;
    email: string;
    patientCode?: string | null;
    lastVisit?: string | null;
  }>();

  for (const appointment of appointments) {
    if (!patientMap.has(appointment.patientId)) {
      patientMap.set(appointment.patientId, {
        id: appointment.patient.id,
        name: appointment.patient.user.name,
        lastName: appointment.patient.user.lastName,
        email: appointment.patient.user.email,
        patientCode: appointment.patient.patientCode,
        lastVisit: appointment.timeSlot.startAt.toISOString(),
      });
    }
  }

  return NextResponse.json({ patients: Array.from(patientMap.values()) });
}

import { Role } from "@prisma/client";

import { getPrismaClient } from "@/lib/prisma";

type AppointmentSummaryOptions = {
  userId: string;
  role: Role;
  take?: number;
};

export async function getAppointmentsForRole({ userId, role, take = 20 }: AppointmentSummaryOptions) {
  const prisma = getPrismaClient();
  const now = new Date();
  const baseSelect = {
    id: true,
    reason: true,
    notes: true,
    status: true,
    timeSlot: { select: { startAt: true, endAt: true } },
    patient: { select: { user: { select: { name: true, lastName: true } } } },
    professional: {
      select: {
        id: true,
        user: { select: { name: true, lastName: true } },
        specialty: { select: { id: true, name: true } },
      },
    },
  };
  const baseFilter = { timeSlot: { startAt: { gte: now } } };

  if (role === "ADMINISTRADOR" || role === "RECEPCIONISTA") {
    return prisma.appointment.findMany({
      where: baseFilter,
      select: baseSelect,
      orderBy: { timeSlot: { startAt: "asc" } },
      take,
    });
  }

  if (role === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!professional) {
      return [];
    }

    return prisma.appointment.findMany({
      where: { professionalId: professional.id, ...baseFilter },
      select: baseSelect,
      orderBy: { timeSlot: { startAt: "asc" } },
      take,
    });
  }

  if (role === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId },
    });

    if (!patient) {
      return [];
    }

    return prisma.appointment.findMany({
      where: { patientId: patient.id, ...baseFilter },
      select: baseSelect,
      orderBy: { timeSlot: { startAt: "asc" } },
      take,
    });
  }

  return [];
}

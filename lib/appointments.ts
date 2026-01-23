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
  const baseInclude = {
    patient: { include: { user: true } },
    professional: { include: { user: true, specialty: true } },
    timeSlot: true,
  };
  const baseFilter = { timeSlot: { startAt: { gte: now } } };

  if (role === "ADMINISTRADOR" || role === "RECEPCIONISTA") {
    return prisma.appointment.findMany({
      where: baseFilter,
      include: baseInclude,
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
      include: baseInclude,
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
      include: baseInclude,
      orderBy: { timeSlot: { startAt: "asc" } },
      take,
    });
  }

  return [];
}

import { AppointmentStatus, type PrismaClient } from "@prisma/client";

import { getClinicInfo } from "@/lib/clinic";

export type DashboardAppointment = {
  id: string;
  status: AppointmentStatus;
  reason: string;
  timeSlot: { startAt: Date; endAt: Date };
  service: { id: string; name: string; priceCents: number } | null;
  serviceName: string | null;
  servicePriceCents: number | null;
  professional: { user: { name: string; lastName: string } };
};

export type DashboardMetrics = {
  totalVisits: number;
  nextAppointment: DashboardAppointment | null;
  recentHistory: DashboardAppointment[];
};

export function computeClientDashboardMetrics(
  appointments: DashboardAppointment[],
  now: Date = new Date(),
): DashboardMetrics {
  const upcomingStatuses = new Set<AppointmentStatus>([
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.PENDING,
  ]);
  const upcoming = appointments
    .filter(
      (appointment) =>
        appointment.timeSlot.startAt > now && upcomingStatuses.has(appointment.status),
    )
    .sort((a, b) => a.timeSlot.startAt.getTime() - b.timeSlot.startAt.getTime());

  const pastAppointments = appointments
    .filter(
      (appointment) =>
        appointment.timeSlot.endAt < now && appointment.status !== AppointmentStatus.CANCELLED,
    )
    .sort((a, b) => b.timeSlot.endAt.getTime() - a.timeSlot.endAt.getTime());

  const totalVisits = appointments.filter(
    (appointment) =>
      appointment.status === AppointmentStatus.COMPLETED ||
      (appointment.status === AppointmentStatus.CONFIRMED && appointment.timeSlot.endAt < now),
  ).length;

  return {
    totalVisits,
    nextAppointment: upcoming[0] ?? null,
    recentHistory: pastAppointments.slice(0, 5),
  };
}

export async function getClientDashboardData(prisma: PrismaClient, userId: string) {
  const patient = await prisma.patientProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!patient) {
    return null;
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: {
      timeSlot: true,
      professional: { include: { user: true } },
      service: true,
    },
    orderBy: { timeSlot: { startAt: "asc" } },
  });

  const metrics = computeClientDashboardMetrics(appointments);
  const clinic = getClinicInfo();

  return {
    patient: {
      id: patient.id,
      name: `${patient.user.name} ${patient.user.lastName}`.trim(),
      patientCode: patient.patientCode,
      avatarUrl: patient.avatarUrl,
    },
    insurance: {
      provider: patient.insuranceProvider,
      status: patient.insuranceStatus,
    },
    clinic,
    totalVisits: metrics.totalVisits,
    nextAppointment: metrics.nextAppointment,
    recentHistory: metrics.recentHistory,
  };
}

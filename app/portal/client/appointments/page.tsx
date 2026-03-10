import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { ClientAppointmentsPanel } from "@/app/portal/client/appointments/ClientAppointmentsPanel";

export default async function ClientAppointmentsPage() {
  const session = await requireRole("PACIENTE");
  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: session.user?.id ?? "" },
  });

  if (!patient) {
    return <p className="text-sm text-slate-500">Aún no tienes perfil de paciente.</p>;
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: { timeSlot: true, professional: { include: { user: true } }, service: true },
    orderBy: { timeSlot: { startAt: "asc" } },
  });

  const now = new Date();
  const upcomingStatuses = new Set<AppointmentStatus>([
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.PENDING,
  ]);
  const upcoming = appointments.filter(
    (appointment) =>
      appointment.timeSlot.startAt > now && upcomingStatuses.has(appointment.status),
  );
  const past = appointments.filter(
    (appointment) => appointment.timeSlot.endAt <= now && appointment.status !== AppointmentStatus.CANCELLED,
  );

  const serialize = (appointment: (typeof appointments)[number]) => ({
    id: appointment.id,
    status: appointment.status,
    startsAt: appointment.timeSlot.startAt.toISOString(),
    endsAt: appointment.timeSlot.endAt.toISOString(),
    serviceLabel: appointment.serviceName ?? appointment.service?.name ?? appointment.reason,
    professionalName: `${appointment.professional.user.name} ${appointment.professional.user.lastName}`,
  });

  return (
    <div className="space-y-8" data-testid="client-appointments-page">
      <header>
        <p className="text-sm font-semibold text-blue-600">Mis turnos</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Gestiona tus citas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">Puedes revisar estado, cancelar o reprogramar desde aquí.</p>
      </header>

      <ClientAppointmentsPanel upcoming={upcoming.map(serialize)} past={past.map(serialize)} />
    </div>
  );
}

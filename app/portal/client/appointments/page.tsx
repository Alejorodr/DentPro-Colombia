import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { AppointmentStatus } from "@prisma/client";

function formatDateTime(date: Date) {
  return formatInTimeZone(date, getAnalyticsTimeZone(), {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-blue-600">Appointments</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Tus próximas citas</h1>
      </header>

      <section className="space-y-4">
        {upcoming.length ? (
          upcoming.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{appointment.status}</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {appointment.serviceName ?? appointment.service?.name ?? appointment.reason}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {formatDateTime(appointment.timeSlot.startAt)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {appointment.professional.user.name} {appointment.professional.user.lastName}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-surface-muted/70 dark:text-slate-300">
                  Confirmada por DentPro
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            No tienes citas próximas. Agenda una nueva visita desde el portal.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial reciente</h2>
        {past.length ? (
          past.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{appointment.status}</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white">
                {appointment.serviceName ?? appointment.service?.name ?? appointment.reason}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-300">{formatDateTime(appointment.timeSlot.startAt)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            Aún no tienes citas completadas.
          </div>
        )}
      </section>
    </div>
  );
}

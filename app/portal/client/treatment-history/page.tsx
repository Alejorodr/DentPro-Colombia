import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";

function formatDate(date: Date) {
  return formatInTimeZone(date, getAnalyticsTimeZone(), { month: "short", day: "2-digit", year: "numeric" });
}

export default async function ClientTreatmentHistoryPage() {
  const session = await requireRole("PACIENTE");
  const prisma = getPrismaClient();
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: session.user?.id ?? "" },
  });

  if (!patient) {
    return <p className="text-sm text-slate-500">Aún no tienes perfil de paciente.</p>;
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id, status: AppointmentStatus.COMPLETED },
    include: { timeSlot: true, professional: { include: { user: true } }, service: true },
    orderBy: { timeSlot: { startAt: "desc" } },
  });

  const clinicalEpisodes = await prisma.clinicalEpisode.findMany({
    where: { patientId: patient.id, visibleToPatient: true, deletedAt: null },
    include: { professional: { include: { user: true } } },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Treatment History</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Historial de tratamientos</h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Citas completadas</h2>
        {appointments.length ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{appointment.status}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {appointment.serviceName ?? appointment.service?.name ?? appointment.reason}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  {formatDate(appointment.timeSlot.startAt)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  {appointment.professional.user.name} {appointment.professional.user.lastName}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            Aún no tienes tratamientos completados. Cuando finalices una cita aparecerá aquí.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Resumen clínico disponible</h2>
        {clinicalEpisodes.length ? (
          <div className="space-y-4">
            {clinicalEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Episodio clínico</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {episode.reason ?? "Consulta clínica"}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-300">{formatDate(episode.date)}</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">
                  {episode.professional.user.name} {episode.professional.user.lastName}
                </p>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                  {episode.treatmentPlan ?? episode.diagnosis ?? "Resumen disponible en clínica."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            No hay episodios clínicos visibles para ti todavía.
          </div>
        )}
      </section>
    </div>
  );
}

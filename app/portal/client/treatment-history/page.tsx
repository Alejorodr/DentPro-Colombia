import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";

function formatDate(date: Date) {
  return formatInTimeZone(date, getAnalyticsTimeZone(), { month: "long", day: "2-digit", year: "numeric" });
}

function groupByDate<T extends { date: Date }>(items: T[]) {
  return items.reduce(
    (acc, item) => {
      const key = formatInTimeZone(item.date, getAnalyticsTimeZone(), { year: "numeric", month: "2-digit", day: "2-digit" });
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
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

  const appointmentGroups = groupByDate(
    appointments.map((appointment) => ({
      id: appointment.id,
      date: appointment.timeSlot.startAt,
      label: appointment.serviceName ?? appointment.service?.name ?? appointment.reason,
      status: "Completada",
      professional: `${appointment.professional.user.name} ${appointment.professional.user.lastName}`,
    })),
  );

  const episodeGroups = groupByDate(
    clinicalEpisodes.map((episode) => ({
      id: episode.id,
      date: episode.date,
      label: episode.reason ?? "Consulta clínica",
      status: episode.diagnosis ? "Con diagnóstico" : "Pendiente de resumen",
      professional: `${episode.professional.user.name} ${episode.professional.user.lastName}`,
      detail: episode.treatmentPlan ?? episode.diagnosis ?? "Resumen disponible en clínica.",
    })),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Historial clínico</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Tu línea de tratamiento</h1>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Citas completadas</h2>
        {Object.keys(appointmentGroups).length ? (
          Object.entries(appointmentGroups).map(([groupDate, items]) => (
            <div key={groupDate} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-300">{formatDate(items[0].date)}</h3>
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{item.label}</p>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{item.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.professional}</p>
                </article>
              ))}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            Aún no tienes tratamientos completados.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Episodios clínicos visibles</h2>
        {Object.keys(episodeGroups).length ? (
          Object.entries(episodeGroups).map(([groupDate, items]) => (
            <div key={groupDate} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-300">{formatDate(items[0].date)}</h3>
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{item.label}</p>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">{item.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.professional}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.detail}</p>
                </article>
              ))}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            No hay episodios clínicos visibles para ti todavía.
          </div>
        )}
      </section>
    </div>
  );
}

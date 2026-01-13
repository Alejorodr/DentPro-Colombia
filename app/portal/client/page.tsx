import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { getClientDashboardData } from "@/lib/portal/client-dashboard";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { NextVisitActions } from "@/app/portal/client/components/NextVisitActions";

function formatDate(date: Date) {
  const timeZone = getAnalyticsTimeZone();
  return formatInTimeZone(date, timeZone, { month: "short", day: "2-digit", year: "numeric" });
}

function formatTimeRange(startAt: Date, endAt: Date) {
  const timeZone = getAnalyticsTimeZone();
  const timeFormatter = new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${timeFormatter.format(startAt)} - ${timeFormatter.format(endAt)}`;
}

const insuranceLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  UNKNOWN: "No definido",
};

export default async function ClientPortalPage() {
  const session = await requireRole("PACIENTE");
  const prisma = getPrismaClient();
  const dashboard = await getClientDashboardData(prisma, session.user?.id ?? "");

  const patientName = dashboard?.patient.name ?? session.user?.name ?? "Paciente";
  const nextAppointment = dashboard?.nextAppointment ?? null;
  const totalVisits = dashboard?.totalVisits ?? 0;
  const insuranceStatus =
    (dashboard?.insurance.status && insuranceLabels[dashboard.insurance.status]) ?? "No definido";
  const insuranceProvider = dashboard?.insurance.provider ?? "Sin proveedor";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-blue-600">Welcome back, {patientName}</p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Overview of your dental health</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Consulta tus citas, historial de tratamientos y próximos pasos.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next cleaning due</p>
          <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            {nextAppointment ? formatDate(nextAppointment.timeSlot.startAt) : "Sin citas próximas"}
          </p>
          <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-surface-muted/60">
            <div className="h-2 w-1/2 rounded-full bg-blue-600" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total visits</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white" data-testid="client-total-visits">
            {totalVisits}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300">Desde tu primera visita</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Insurance status</p>
          <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">{insuranceStatus}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{insuranceProvider}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Next Visit</h2>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-surface-muted/70 dark:bg-surface-elevated">
              {nextAppointment ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <div className="space-y-4">
                    <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:bg-surface-muted dark:text-accent-cyan">
                      {nextAppointment.status}
                    </span>
                    <div>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                        {nextAppointment.serviceName ?? nextAppointment.service?.name ?? nextAppointment.reason}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-300">
                        Procedure Code: {(nextAppointment.service?.id ?? nextAppointment.id).slice(0, 6).toUpperCase()}
                      </p>
                    </div>
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <div>
                        <p className="font-semibold">Date &amp; time</p>
                        <p>
                          {formatDate(nextAppointment.timeSlot.startAt)} ·{" "}
                          {formatTimeRange(nextAppointment.timeSlot.startAt, nextAppointment.timeSlot.endAt)}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Specialist</p>
                        <p>
                          {nextAppointment.professional.user.name} {nextAppointment.professional.user.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold">Location</p>
                        <p>{dashboard?.clinic.name ?? "DentPro"}</p>
                      </div>
                    </div>
                    <NextVisitActions detailsHref="/portal/client/appointments" />
                  </div>
                  <div className="flex items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-surface-muted/60 dark:text-slate-300">
                    Imagen de consultorio
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  Aún no tienes una próxima cita agendada. Reserva una nueva visita para mantener tu salud dental al día.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-700 dark:border-surface-muted/70 dark:bg-surface-muted/60 dark:text-slate-200">
            <p className="font-semibold">Pre-visit Instructions</p>
            <p className="mt-2">
              Llega 15 minutos antes de tu cita para completar los formularios médicos y recuerda evitar alimentos sólidos 2
              horas antes del procedimiento.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent History</h2>
            <Link href="/portal/client/treatment-history" className="text-sm font-semibold text-blue-600">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {dashboard?.recentHistory?.length ? (
              dashboard.recentHistory.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-surface-muted/70 dark:bg-surface-elevated"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{appointment.status}</span>
                    <span>{formatDate(appointment.timeSlot.startAt)}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                    {appointment.serviceName ?? appointment.service?.name ?? appointment.reason}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    {appointment.professional.user.name} {appointment.professional.user.lastName}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
                Aún no tienes historial de citas completadas.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

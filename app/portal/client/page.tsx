import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { getPrismaClient } from "@/lib/prisma";
import { getClientDashboardData } from "@/lib/portal/client-dashboard";
import { formatInTimeZone, getAnalyticsTimeZone } from "@/lib/dates/tz";
import { NextVisitActions } from "@/app/portal/client/components/NextVisitActions";
import { operationalStatusLabel, toOperationalStatus } from "@/lib/appointments/status";

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
    <div className="space-y-8" data-testid="client-dashboard-page">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-blue-600">Hola, {patientName}</p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Tu portal de paciente</h1>
        <p className="text-sm text-slate-500 dark:text-slate-300">Revisa tus próximas citas, historial y accesos rápidos en un solo lugar.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/portal/client/book" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-xs hover:border-blue-200 dark:border-surface-muted/70 dark:bg-surface-elevated dark:text-slate-100">
          Reservar turno
        </Link>
        <Link href="/portal/client/treatment-history" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-xs hover:border-blue-200 dark:border-surface-muted/70 dark:bg-surface-elevated dark:text-slate-100">
          Ver historial
        </Link>
        <Link href="/portal/client/profile" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-xs hover:border-blue-200 dark:border-surface-muted/70 dark:bg-surface-elevated dark:text-slate-100">
          Actualizar perfil
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Próximo turno</p>
          <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            {nextAppointment ? formatDate(nextAppointment.timeSlot.startAt) : "Sin citas próximas"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total de visitas</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white" data-testid="client-total-visits">
            {totalVisits}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300">Desde tu primera atención</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cobertura</p>
          <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">{insuranceStatus}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{insuranceProvider}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Próxima visita</h2>
            <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
              {nextAppointment ? (
                <div className="space-y-4">
                  <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:bg-surface-muted dark:text-accent-cyan">
                    {operationalStatusLabel(toOperationalStatus(nextAppointment))}
                  </span>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {nextAppointment.serviceName ?? nextAppointment.service?.name ?? nextAppointment.reason}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-300">
                      {formatDate(nextAppointment.timeSlot.startAt)} · {formatTimeRange(nextAppointment.timeSlot.startAt, nextAppointment.timeSlot.endAt)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {nextAppointment.professional.user.name} {nextAppointment.professional.user.lastName} · {dashboard?.clinic.name ?? "DentPro"}
                  </p>
                  <NextVisitActions detailsHref="/portal/client/appointments" />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
                  Aún no tienes próxima cita. Te recomendamos reservar tu control para mantener el tratamiento al día.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial reciente</h2>
            <Link href="/portal/client/treatment-history" className="text-sm font-semibold text-blue-600">
              Ver todo
            </Link>
          </div>
          <div className="space-y-4">
            {dashboard?.recentHistory?.length ? (
              dashboard.recentHistory.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{appointment.status}</span>
                    <span>{formatDate(appointment.timeSlot.startAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {appointment.serviceName ?? appointment.service?.name ?? appointment.reason}
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

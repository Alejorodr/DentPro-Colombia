import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath, isUserRole, roleLabels, type UserRole } from "@/lib/auth/roles";
import type { AppointmentSummary } from "@/lib/api/types";

function buildApiUrl(path: string) {
  const host = headers().get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  return host ? `${protocol}://${host}${path}` : path;
}

async function fetchAppointments() {
  const response = await fetch(buildApiUrl("/api/appointments"), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar las citas.");
  }

  return (await response.json()) as AppointmentSummary[];
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: AppointmentSummary["status"]) {
  const labels: Record<AppointmentSummary["status"], string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
  };

  return labels[status] ?? status;
}

interface DashboardPageProps {
  params: { role: string };
}

export default async function AppointmentsPage({ params }: DashboardPageProps) {
  const requestedRole = params.role;

  if (!isUserRole(requestedRole)) {
    notFound();
  }

  const session = await auth();

  if (!session || !session.user?.role || !isUserRole(session.user.role)) {
    redirect(`/login?callbackUrl=/${requestedRole}`);
  }

  if (session.user.role !== requestedRole) {
    redirect(getDefaultDashboardPath(session.user.role));
  }

  const appointments = await fetchAppointments();
  const roleLabel = roleLabels[requestedRole as UserRole];

  return (
    <main className="space-y-6 py-6">
      <header className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-elevated dark:ring-surface-muted">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
          {roleLabel}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Citas</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Revisa las solicitudes y citas agendadas con su estado actual.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-elevated dark:ring-surface-muted">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Listado</h2>
          <Link href={`/${requestedRole}`} className="text-sm font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
            Volver al tablero
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-surface-muted dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">Paciente</th>
                <th className="px-3 py-2">Servicio</th>
                <th className="px-3 py-2">Fecha / hora</th>
                <th className="px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-300" colSpan={4}>
                    No hay citas registradas aún.
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-slate-100 last:border-0 dark:border-surface-muted"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      {appointment.patientId === "unassigned" ? "Por asignar" : appointment.patientId}
                    </td>
                    <td className="px-3 py-3">{appointment.service}</td>
                    <td className="px-3 py-3">{formatDate(appointment.scheduledAt)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-surface-muted dark:text-slate-200">
                        {formatStatus(appointment.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

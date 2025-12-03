import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath, isUserRole, roleLabels, type UserRole } from "@/lib/auth/roles";
import type { ScheduleSlot } from "@/lib/api/types";

function buildApiUrl(path: string) {
  const host = headers().get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  return host ? `${protocol}://${host}${path}` : path;
}

async function fetchSchedules() {
  const response = await fetch(buildApiUrl("/api/schedules"), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los horarios.");
  }

  return (await response.json()) as ScheduleSlot[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface DashboardPageProps {
  params: { role: string };
}

export default async function SchedulesPage({ params }: DashboardPageProps) {
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

  const schedules = await fetchSchedules();
  const roleLabel = roleLabels[requestedRole as UserRole];

  return (
    <main className="space-y-6 py-6">
      <header className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-elevated dark:ring-surface-muted">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
          {roleLabel}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Horarios</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Consulta la disponibilidad actual de los especialistas.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-elevated dark:ring-surface-muted">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Disponibilidad</h2>
          <Link href={`/${requestedRole}`} className="text-sm font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
            Volver al tablero
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
            <thead className="sticky top-[4.5rem] z-10 border-b border-slate-200 bg-white/90 text-xs uppercase tracking-wide text-slate-500 backdrop-blur dark:border-surface-muted dark:bg-surface-elevated/90 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2">Especialista</th>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Fin</th>
                <th className="px-3 py-2">Disponible</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-300" colSpan={4}>
                    No hay horarios configurados.
                  </td>
                </tr>
              ) : (
                schedules.map((slot) => (
                  <tr
                    key={slot.id}
                    className="border-b border-slate-100 last:border-0 dark:border-surface-muted"
                  >
                    <td className="max-w-[200px] px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      <span className="line-clamp-2 break-words">{slot.specialistName ?? slot.specialistId}</span>
                    </td>
                    <td className="px-3 py-3">{formatDate(slot.start)}</td>
                    <td className="px-3 py-3">{formatDate(slot.end)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${slot.available ? "bg-brand-teal" : "bg-slate-500"}`}
                      >
                        {slot.available ? "Disponible" : "No disponible"}
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

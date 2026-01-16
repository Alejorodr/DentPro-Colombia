"use client";

import Link from "next/link";

import { Table } from "@/app/portal/components/ui/Table";

type AppointmentItem = {
  id: string;
  patientName: string | null;
  professionalName: string | null;
  serviceName: string | null;
  timeLabel: string;
  status: string;
};

const statusStyles: Record<string, string> = {
  CheckedIn: "bg-emerald-100 text-emerald-700",
  Waiting: "bg-amber-100 text-amber-700",
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-rose-100 text-rose-700",
  Completed: "bg-blue-100 text-blue-700",
};

export function AppointmentsTable({ appointments }: { appointments: AppointmentItem[] }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs shadow-slate-100/60 dark:border-surface-muted/70 dark:bg-surface-elevated/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Today&apos;s Appointments
          </p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agenda del día</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200">
            Filter
          </button>
          <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200">
            Export
          </button>
        </div>
      </div>
      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:text-slate-400">
          No hay citas registradas.
        </div>
      ) : (
        <>
          <Table>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Servicio</th>
                <th className="px-4 py-3 font-semibold">Profesional</th>
                <th className="px-4 py-3 font-semibold">Hora</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
              {appointments.map((appointment) => {
                const statusKey = appointment.status
                  .toLowerCase()
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (value) => value.toUpperCase());
                return (
                  <tr key={appointment.id} className="bg-white dark:bg-surface-elevated/60">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {appointment.patientName ?? "—"}
                    </td>
                    <td className="px-4 py-3">{appointment.serviceName ?? "—"}</td>
                    <td className="px-4 py-3">{appointment.professionalName ?? "—"}</td>
                    <td className="px-4 py-3">{appointment.timeLabel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[statusKey] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusKey}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="text-right">
            <Link href="/portal/admin/appointments" className="text-xs font-semibold text-brand-teal dark:text-accent-cyan">
              Ver todas las citas
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";

import { Table } from "@/app/portal/components/ui/Table";
import { StatusBadge } from "@/app/portal/components/ui/StatusBadge";

type AppointmentItem = {
  id: string;
  patientName: string | null;
  professionalName: string | null;
  serviceName: string | null;
  timeLabel: string;
  status: string;
};

export function AppointmentsTable({ appointments }: { appointments: AppointmentItem[] }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs shadow-slate-100/60 dark:border-surface-muted/70 dark:bg-surface-elevated/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Resumen del período
          </p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Agenda del día</h2>
        </div>
        <Link
          href="/portal/admin/appointments"
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted dark:text-slate-200"
        >
          Ver todas
        </Link>
      </div>
      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:text-slate-400">
          No hay citas registradas para el período seleccionado.
        </div>
      ) : (
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
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="bg-white dark:bg-surface-elevated/60">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                  {appointment.patientName ?? "—"}
                </td>
                <td className="px-4 py-3">{appointment.serviceName ?? "—"}</td>
                <td className="px-4 py-3">{appointment.professionalName ?? "—"}</td>
                <td className="px-4 py-3">{appointment.timeLabel}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={appointment.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

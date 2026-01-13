"use client";

import { useState } from "react";

import { Funnel, ArrowsClockwise, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { AppointmentStatus } from "@prisma/client";

import { Table } from "@/app/portal/components/ui/Table";
import { RescheduleModal } from "@/app/portal/receptionist/components/RescheduleModal";

type AppointmentSummary = {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  patient: { id: string; name: string } | null;
  professional: { id: string; name: string; specialty: string | null } | null;
  service: { id: string; name: string } | null;
  reason: string;
};

interface AppointmentTableProps {
  appointments: AppointmentSummary[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Checked In",
};

const statusStyles: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export function AppointmentTable({ appointments, page, totalPages, onPageChange, onRefresh }: AppointmentTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    setBusyId(id);
    const response = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      onRefresh();
    }

    setBusyId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Funnel size={16} />
          Filter
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
        >
          Export
        </button>
      </div>
      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:bg-surface-elevated/80 dark:text-slate-300">
          No hay turnos en este rango.
        </div>
      ) : (
        <div className="space-y-3">
          <Table>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Hora</th>
                <th className="px-4 py-3 font-semibold">Paciente</th>
                <th className="px-4 py-3 font-semibold">Tratamiento</th>
                <th className="px-4 py-3 font-semibold">Profesional</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
              {appointments.map((appointment) => {
                const start = new Date(appointment.startAt);
                const end = new Date(appointment.endAt);
                const timeLabel = `${start.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
                return (
                  <tr key={appointment.id} className="bg-white dark:bg-surface-elevated/60">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{timeLabel}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{appointment.patient?.name ?? "Sin paciente"}</p>
                      <p className="text-xs text-slate-500">ID {appointment.patient?.id ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {appointment.service?.name ?? appointment.reason}
                      </p>
                      <p className="text-xs text-slate-500">{appointment.reason}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {appointment.professional?.name ?? "-"}
                      </p>
                      <p className="text-xs text-slate-500">{appointment.professional?.specialty ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[appointment.status]
                        }`}
                      >
                        {statusLabels[appointment.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
                          value={appointment.status}
                          onChange={(event) => updateStatus(appointment.id, event.target.value as AppointmentStatus)}
                          disabled={busyId === appointment.id}
                        >
                          <option value={AppointmentStatus.PENDING}>Pending</option>
                          <option value={AppointmentStatus.CONFIRMED}>Confirmed</option>
                          <option value={AppointmentStatus.COMPLETED}>Checked In</option>
                          <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
                        </select>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-brand-teal px-3 py-1 text-xs font-semibold uppercase text-brand-teal"
                          onClick={() => setRescheduleId(appointment.id)}
                          disabled={busyId === appointment.id}
                        >
                          <ArrowsClockwise size={14} />
                          Reprogramar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-40 dark:border-surface-muted"
                onClick={() => onPageChange(Math.max(page - 1, 1))}
                disabled={page <= 1}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-40 dark:border-surface-muted"
                onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                disabled={page >= totalPages}
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
      <RescheduleModal
        appointmentId={rescheduleId}
        open={Boolean(rescheduleId)}
        onClose={() => setRescheduleId(null)}
        onUpdated={onRefresh}
      />
    </div>
  );
}

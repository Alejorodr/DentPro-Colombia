"use client";

import { useMemo, useState } from "react";

import type { AppointmentSummary } from "@/lib/api/types";

interface AppointmentsTableProps {
  appointments: AppointmentSummary[];
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

export function AppointmentsTable({ appointments }: AppointmentsTableProps) {
  const [rows, setRows] = useState(appointments);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);

  const handleStatusChange = async (id: string, status: AppointmentSummary["status"]) => {
    setUpdatingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "No se pudo actualizar la cita.");
      }

      const updated = (await response.json()) as AppointmentSummary;
      setRows((previous) => previous.map((item) => (item.id === id ? updated : item)));
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message);
      } else {
        setError("No se pudo actualizar el estado. Inténtalo nuevamente.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-surface-muted dark:text-slate-300">
          <tr>
            <th className="px-3 py-2">Paciente</th>
            <th className="px-3 py-2">Servicio</th>
            <th className="px-3 py-2">Fecha / hora</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {!hasRows ? (
            <tr>
              <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-300" colSpan={5}>
                No hay citas registradas aún.
              </td>
            </tr>
          ) : (
            rows.map((appointment) => (
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
                <td className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  {appointment.status === "cancelled" ? (
                    <span className="text-slate-400 dark:text-slate-500">Sin acciones</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      {appointment.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="btn-primary btn-xs"
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusChange(appointment.id, "confirmed")}
                          >
                            {updatingId === appointment.id ? "Actualizando..." : "Confirmar"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-xs"
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusChange(appointment.id, "cancelled")}
                          >
                            {updatingId === appointment.id ? "Actualizando..." : "Cancelar"}
                          </button>
                        </>
                      ) : null}
                      {appointment.status === "confirmed" ? (
                        <button
                          type="button"
                          className="btn-secondary btn-xs"
                          disabled={updatingId === appointment.id}
                          onClick={() => handleStatusChange(appointment.id, "cancelled")}
                        >
                          {updatingId === appointment.id ? "Actualizando..." : "Cancelar"}
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {error ? <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

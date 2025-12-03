"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  useEffect(() => {
    setRows(appointments);
  }, [appointments]);

  const services = useMemo(() => Array.from(new Set(appointments.map((item) => item.service))), [appointments]);

  const filteredRows = useMemo(() => {
    return rows.filter((appointment) => {
      const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
      const matchesService = serviceFilter === "all" || appointment.service === serviceFilter;

      if (!matchesStatus || !matchesService) {
        return false;
      }

      if (!dateFilter) {
        return true;
      }

      const appointmentDate = new Date(appointment.scheduledAt);
      const selectedDate = new Date(dateFilter);

      return (
        appointmentDate.getFullYear() === selectedDate.getFullYear() &&
        appointmentDate.getMonth() === selectedDate.getMonth() &&
        appointmentDate.getDate() === selectedDate.getDate()
      );
    });
  }, [rows, statusFilter, serviceFilter, dateFilter]);

  const hasRows = filteredRows.length > 0;

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
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-surface-muted/70 dark:text-slate-200 dark:ring-surface-muted md:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide">Estado</span>
          <select
            className="input h-10"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="confirmed">Confirmadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide">Servicio</span>
          <select
            className="input h-10"
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide">Fecha</span>
          <input
            type="date"
            className="input h-10"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
          <thead className="sticky top-[4.5rem] z-10 border-b border-slate-200 bg-white/90 text-xs uppercase tracking-wide text-slate-500 backdrop-blur dark:border-surface-muted dark:bg-surface-elevated/90 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2">Paciente</th>
              <th className="px-3 py-2">Especialista</th>
              <th className="px-3 py-2">Servicio</th>
              <th className="px-3 py-2">Fecha / hora</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!hasRows ? (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-300" colSpan={6}>
                  No hay citas registradas aún.
                </td>
              </tr>
            ) : (
              filteredRows.map((appointment) => {
                const patientLabel =
                  appointment.patientName ??
                  (appointment.patientId === "unassigned" ? "Por asignar" : appointment.patientId);
                const specialistLabel =
                  appointment.specialistName ??
                  (appointment.specialistId === "unassigned" ? "Por asignar" : appointment.specialistId);

                return (
                  <tr
                    key={appointment.id}
                    className="border-b border-slate-100 last:border-0 dark:border-surface-muted"
                  >
                    <td className="max-w-[180px] px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      <span className="line-clamp-2 break-words">{patientLabel}</span>
                    </td>
                    <td className="max-w-[180px] px-3 py-3">
                      <span className="line-clamp-2 break-words">{specialistLabel}</span>
                    </td>
                    <td className="max-w-[160px] px-3 py-3">
                      <span className="line-clamp-2 break-words">{appointment.service}</span>
                    </td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

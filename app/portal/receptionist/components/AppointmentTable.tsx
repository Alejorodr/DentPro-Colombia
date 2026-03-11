"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  Funnel,
  ArrowLeft,
  ArrowRight,
  Eye,
  PencilSimple,
  CheckCircle,
  XCircle,
  UserCheck,
  WarningCircle,
} from "@/components/ui/Icon";
import { AppointmentStatus } from "@prisma/client";

import { Table } from "@/app/portal/components/ui/Table";
import { RescheduleModal } from "@/app/portal/components/RescheduleModal";
import { AppointmentEventTimeline } from "@/app/portal/components/appointments/AppointmentEventTimeline";
import { fetchWithTimeout } from "@/lib/http";
import { operationalStatusLabel, toOperationalStatus } from "@/lib/appointments/status";

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
  groupByProfessional?: boolean;
  appointments: AppointmentSummary[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  initialEventsAppointmentId?: string | null;
}

const statusStyles: Record<string, string> = {
  SCHEDULED: "border border-amber-200 bg-amber-100 text-amber-800",
  CONFIRMED: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  CHECKED_IN: "border border-cyan-200 bg-cyan-100 text-cyan-800",
  COMPLETED: "border border-indigo-200 bg-indigo-100 text-indigo-800",
  CANCELLED: "border border-rose-200 bg-rose-100 text-rose-800",
  NO_SHOW: "border border-fuchsia-200 bg-fuchsia-100 text-fuchsia-800",
};

export function AppointmentTable({ appointments, page, totalPages, onPageChange, onRefresh, initialEventsAppointmentId = null, groupByProfessional = false }: AppointmentTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [eventsAppointmentId, setEventsAppointmentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialEventsAppointmentId) {
      setEventsAppointmentId(initialEventsAppointmentId);
    }
  }, [initialEventsAppointmentId]);

  const updateStatus = async (id: string, status: AppointmentStatus, action?: "check_in" | "mark_no_show") => {
    if ((status === AppointmentStatus.CANCELLED || action === "mark_no_show") && !window.confirm("¿Confirmas este cambio de estado?")) {
      return;
    }

    setBusyId(id);
    setFeedback(null);
    const response = await fetchWithTimeout(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, action }),
    });

    if (response.ok) {
      setFeedback("Estado actualizado correctamente.");
      onRefresh();
    } else {
      setFeedback("No se pudo actualizar el estado. Intenta nuevamente.");
    }

    setBusyId(null);
  };

  const timeline = useMemo(() => {
    return [...appointments].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [appointments]);


  const groupedTimeline = useMemo(() => {
    if (!groupByProfessional) return [];
    const groups = new Map<string, { name: string; items: AppointmentSummary[] }>();
    for (const appointment of timeline) {
      const key = appointment.professional?.id ?? "unknown";
      const current = groups.get(key) ?? { name: appointment.professional?.name ?? "Sin profesional", items: [] };
      current.items.push(appointment);
      groups.set(key, current);
    }
    return Array.from(groups.values());
  }, [groupByProfessional, timeline]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Funnel size={16} />
          Operación diaria
        </div>
        {eventsAppointmentId ? (
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600"
            onClick={() => setEventsAppointmentId(null)}
          >
            Cerrar timeline
          </button>
        ) : null}
      </div>

      {eventsAppointmentId ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-surface-muted dark:bg-surface-base/70">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Historial de la cita</p>
          <AppointmentEventTimeline appointmentId={eventsAppointmentId} />
        </div>
      ) : null}

      {feedback ? <p aria-live="polite" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">{feedback}</p> : null}

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:bg-surface-elevated/80 dark:text-slate-300">
          No hay turnos en este rango.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline del día</p>
            {groupByProfessional ? (
              <div className="space-y-4">
                {groupedTimeline.map((group) => (
                  <div key={group.name} className="rounded-xl border border-slate-200/80 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{group.name}</p>
                    <div className="space-y-2">
                      {group.items.map((appointment) => {
                        const slot = toOperationalStatus(appointment);
                        return (
                          <div key={`timeline-${appointment.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs">
                            <span>
                              {new Date(appointment.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · {appointment.patient?.name ?? "Paciente"}
                            </span>
                            <span className={`rounded-full px-2 py-1 font-semibold ${statusStyles[slot]}`}>{operationalStatusLabel(slot)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {timeline.map((appointment) => {
                  const slot = toOperationalStatus(appointment);
                  return (
                    <div key={`timeline-${appointment.id}`} className="flex items-center justify-between rounded-xl border-l-4 border-l-brand-teal border border-slate-200 bg-white px-3 py-2 text-xs shadow-xs">
                      <span>
                        {new Date(appointment.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} · {appointment.patient?.name ?? "Paciente"}
                      </span>
                      <span className={`rounded-full px-2 py-1 font-semibold ${statusStyles[slot]}`}>{operationalStatusLabel(slot)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
                const operationalStatus = toOperationalStatus(appointment);
                return (
                  <tr key={appointment.id} className="bg-white dark:bg-surface-elevated/60">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{timeLabel}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{appointment.patient?.name ?? "Sin paciente"}</p>
                      <p className="text-xs text-slate-500">ID {appointment.patient?.id ?? "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{appointment.service?.name ?? appointment.reason}</p>
                      <p className="text-xs text-slate-500">{appointment.reason}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{appointment.professional?.name ?? "-"}</p>
                      <p className="text-xs text-slate-500">{appointment.professional?.specialty ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[operationalStatus]}`}>
                        {operationalStatusLabel(operationalStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/portal/receptionist/patients?patient=${appointment.patient?.id ?? ""}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600">
                          <Eye size={14} />
                          Paciente
                        </Link>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600" onClick={() => setEventsAppointmentId(appointment.id)}>
                          <Eye size={14} />Ver eventos
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-brand-teal bg-brand-teal/10 px-3 py-1 text-xs font-semibold uppercase text-brand-teal ring-1 ring-brand-teal/20" onClick={() => setRescheduleId(appointment.id)} disabled={busyId === appointment.id}>
                          <PencilSimple size={14} />Reprogramar
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold uppercase text-emerald-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.CONFIRMED)} disabled={busyId === appointment.id || appointment.status !== AppointmentStatus.SCHEDULED}>
                          <CheckCircle size={14} />Confirmar
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold uppercase text-blue-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.CHECKED_IN, "check_in")} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <UserCheck size={14} />En sala
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold uppercase text-indigo-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.COMPLETED)} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <CheckCircle size={14} />Atendida
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 px-3 py-1 text-xs font-semibold uppercase text-fuchsia-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.NO_SHOW, "mark_no_show")} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <WarningCircle size={14} />No asistió
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase text-rose-700 disabled:opacity-50" onClick={() => updateStatus(appointment.id, AppointmentStatus.CANCELLED)} disabled={busyId === appointment.id || ([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] as AppointmentStatus[]).includes(appointment.status)}>
                          <XCircle size={14} />Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Página {page} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-40" onClick={() => onPageChange(Math.max(page - 1, 1))} disabled={page <= 1}><ArrowLeft size={14} /></button>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 disabled:opacity-40" onClick={() => onPageChange(Math.min(page + 1, totalPages))} disabled={page >= totalPages}><ArrowRight size={14} /></button>
            </div>
          </div>
        </>
      )}
      <RescheduleModal appointmentId={rescheduleId} open={Boolean(rescheduleId)} onClose={() => setRescheduleId(null)} onUpdated={() => onRefresh()} />
    </div>
  );
}

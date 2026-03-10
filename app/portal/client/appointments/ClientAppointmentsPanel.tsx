"use client";

import { useMemo, useState } from "react";

import { RescheduleModal } from "@/app/portal/components/RescheduleModal";
import { CalendarBlank, CheckCircle, Clock, WarningCircle, XCircle } from "@/components/ui/Icon";

type AppointmentItem = {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  startsAt: string;
  endsAt: string;
  serviceLabel: string;
  professionalName: string;
};

const statusStyles: Record<AppointmentItem["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  COMPLETED: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
};

const statusLabels: Record<AppointmentItem["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ClientAppointmentsPanel({ upcoming, past }: { upcoming: AppointmentItem[]; past: AppointmentItem[] }) {
  const [appointments, setAppointments] = useState(upcoming);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const nextActionable = useMemo(
    () => appointments.filter((appointment) => appointment.status === "CONFIRMED" || appointment.status === "PENDING"),
    [appointments],
  );

  const cancelAppointment = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta cita? Esta acción no se puede deshacer.")) {
      return;
    }

    setProcessingId(id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFeedback({ kind: "error", message: payload?.error ?? "No se pudo cancelar la cita." });
        return;
      }

      setAppointments((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "CANCELLED",
              }
            : item,
        ),
      );
      setFeedback({ kind: "success", message: "Cita cancelada correctamente." });
    } catch {
      setFeedback({ kind: "error", message: "Error de red al cancelar la cita. Intenta nuevamente." });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {feedback ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Próximas citas</h2>
        {appointments.length ? (
          appointments.map((appointment) => (
            <article
              key={appointment.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[appointment.status]}`}>
                    {statusLabels[appointment.status]}
                  </span>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{appointment.serviceLabel}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{formatDateTime(appointment.startsAt)}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{appointment.professionalName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-muted dark:text-slate-200"
                    onClick={() => setRescheduleId(appointment.id)}
                    disabled={processingId === appointment.id || appointment.status === "CANCELLED"}
                  >
                    <CalendarBlank size={14} aria-hidden="true" />
                    Reprogramar
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => cancelAppointment(appointment.id)}
                    disabled={processingId === appointment.id || appointment.status === "CANCELLED"}
                  >
                    <XCircle size={14} aria-hidden="true" />
                    {processingId === appointment.id ? "Cancelando..." : "Cancelar"}
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            No tienes citas próximas. Reserva una nueva visita para continuar tu tratamiento.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial reciente</h2>
        {past.length ? (
          past.map((appointment) => (
            <article
              key={appointment.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{appointment.serviceLabel}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-300">{formatDateTime(appointment.startsAt)}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[appointment.status]}`}>
                  {statusLabels[appointment.status]}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
            Aún no hay historial para mostrar.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-surface-muted dark:bg-surface-muted/30 dark:text-slate-200">
        <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Estados de cita</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="inline-flex items-center gap-2"><Clock size={14} /> Pendiente: aún en confirmación.</li>
          <li className="inline-flex items-center gap-2"><CheckCircle size={14} /> Confirmada: todo listo para tu atención.</li>
          <li className="inline-flex items-center gap-2"><WarningCircle size={14} /> Cancelada: debes reservar un nuevo turno.</li>
        </ul>
      </section>

      <RescheduleModal
        appointmentId={rescheduleId}
        open={Boolean(rescheduleId)}
        onClose={() => setRescheduleId(null)}
        onUpdated={(updated) => {
          if (!updated) {
            return;
          }
          setAppointments((current) =>
            current.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    startsAt: updated.timeSlot.startAt,
                    endsAt: updated.timeSlot.endAt,
                    status: (updated.status as AppointmentItem["status"]) ?? item.status,
                  }
                : item,
            ),
          );
          setFeedback({ kind: "success", message: "Cita reprogramada con éxito." });
        }}
      />

      {nextActionable.length === 0 ? null : (
        <p className="text-xs text-slate-500 dark:text-slate-300">Puedes cancelar o reprogramar con al menos 24 horas de anticipación.</p>
      )}
    </div>
  );
}

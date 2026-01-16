"use client";

import { useState } from "react";

import type { UserRole } from "@/lib/auth/roles";

type AppointmentItem = {
  id: string;
  reason: string;
  notes?: string | null;
  status: string;
  timeSlot: { startAt: string; endAt: string };
  patient: { user: { name: string; lastName: string } } | null;
  professional:
    | {
        id: string;
        user: { name: string; lastName: string };
        specialty: { id: string; name: string };
      }
    | null;
};

interface AppointmentsListProps {
  initialAppointments: AppointmentItem[];
  role: UserRole;
}

function formatDateRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function AppointmentsList({ initialAppointments, role }: AppointmentsListProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    setBusyId(id);
    const response = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (response.ok) {
      const updated = await response.json();
      setAppointments((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }

    setBusyId(null);
  };

  const reschedule = async (id: string) => {
    const timeSlotId = window.prompt("Ingresa el ID del nuevo slot disponible:");
    if (!timeSlotId) {
      return;
    }

    setBusyId(id);
    const response = await fetch(`/api/appointments/${id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSlotId }),
    });

    if (response.ok) {
      const updated = await response.json();
      setAppointments((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }

    setBusyId(null);
  };

  return (
    <div className="space-y-4">
      {appointments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:text-slate-400">
          No hay citas registradas.
        </p>
      ) : (
        appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
                  {appointment.status}
                </p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{appointment.reason}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {formatDateRange(appointment.timeSlot.startAt, appointment.timeSlot.endAt)}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Profesional: {appointment.professional?.user.name} {appointment.professional?.user.lastName} · {appointment.professional?.specialty.name}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Paciente: {appointment.patient?.user.name} {appointment.patient?.user.lastName}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === "PACIENTE" ? (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
                      disabled={busyId === appointment.id}
                      onClick={() => updateStatus(appointment.id, "CANCELLED")}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-brand-teal px-4 py-2 text-xs font-semibold uppercase text-brand-teal"
                      disabled={busyId === appointment.id}
                      onClick={() => reschedule(appointment.id)}
                    >
                      Reprogramar
                    </button>
                  </>
                ) : null}
                {role === "PROFESIONAL" ? (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-brand-teal px-4 py-2 text-xs font-semibold uppercase text-brand-teal"
                      disabled={busyId === appointment.id}
                      onClick={() => updateStatus(appointment.id, "CONFIRMED")}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
                      disabled={busyId === appointment.id}
                      onClick={() => updateStatus(appointment.id, "COMPLETED")}
                    >
                      Completar
                    </button>
                  </>
                ) : null}
                {role === "RECEPCIONISTA" || role === "ADMINISTRADOR" ? (
                  <>
                    <button
                      type="button"
                      className="rounded-full border border-brand-teal px-4 py-2 text-xs font-semibold uppercase text-brand-teal"
                      disabled={busyId === appointment.id}
                      onClick={() => updateStatus(appointment.id, "CONFIRMED")}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
                      disabled={busyId === appointment.id}
                      onClick={() => updateStatus(appointment.id, "CANCELLED")}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-brand-teal px-4 py-2 text-xs font-semibold uppercase text-brand-teal"
                      disabled={busyId === appointment.id}
                      onClick={() => reschedule(appointment.id)}
                    >
                      Reprogramar
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {appointment.notes ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Notas: {appointment.notes}</p>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

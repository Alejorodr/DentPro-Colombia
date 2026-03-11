"use client";

import { useEffect, useState } from "react";

import { getAppointmentEventLabel } from "@/lib/appointments/activity";
import { fetchWithRetry } from "@/lib/http";

type AppointmentEventItem = {
  id: string;
  action: string;
  createdAt: string;
  actorRole?: string | null;
  newStatus?: "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "COMPLETED" | "NO_SHOW" | null;
  actorUser?: {
    name?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  metadata?: {
    previousSlotId?: string;
    newSlotId?: string;
  } | null;
};

export function AppointmentEventTimeline({ appointmentId }: { appointmentId: string }) {
  const [events, setEvents] = useState<AppointmentEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const response = await fetchWithRetry(`/api/appointments/${appointmentId}/events`);
      if (!response.ok) {
        if (active) {
          setError("No fue posible cargar el historial de eventos.");
          setIsLoading(false);
        }
        return;
      }
      const data = (await response.json()) as { events?: AppointmentEventItem[] };
      if (active) {
        setEvents(data.events ?? []);
        setIsLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  if (isLoading) {
    return <p className="text-xs text-slate-500">Cargando timeline...</p>;
  }

  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>;
  }

  if (events.length === 0) {
    return <p className="text-xs text-slate-500">Aún no hay eventos registrados para esta cita.</p>;
  }

  return (
    <ol className="space-y-2" aria-label="Timeline de eventos de cita">
      {events.map((event) => {
        const actor = event.actorUser
          ? `${event.actorUser.name ?? ""} ${event.actorUser.lastName ?? ""}`.trim() || event.actorUser.email
          : event.actorRole ?? "Sistema";

        return (
          <li key={event.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-surface-muted dark:bg-surface-base/80">
            <p className="font-semibold text-slate-900 dark:text-white">{getAppointmentEventLabel(event.action, event.newStatus ?? null)}</p>
            <p className="text-slate-500 dark:text-slate-400">{new Date(event.createdAt).toLocaleString("es-CO")}</p>
            <p className="text-slate-500 dark:text-slate-400">Actor: {actor}</p>
            {event.action === "rescheduled" && event.metadata?.newSlotId ? (
              <p className="text-slate-500 dark:text-slate-400">Reprogramación: {event.metadata.previousSlotId ?? "-"} → {event.metadata.newSlotId}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

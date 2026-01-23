"use client";

import { useEffect, useState } from "react";

import { X } from "@/components/ui/Icon";

import { formatDateInput } from "@/lib/dates/tz";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
  professional: { user: { name: string; lastName: string } };
};

export type RescheduledAppointment = {
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
  service?: { id: string; name: string } | null;
};

interface RescheduleModalProps {
  appointmentId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (appointment?: RescheduledAppointment) => void;
}

export function RescheduleModal({ appointmentId, open, onClose, onUpdated }: RescheduleModalProps) {
  const [date, setDate] = useState(() => formatDateInput(new Date(), "America/Bogota"));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; startAt: string; endAt: string }>>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSlots([]);
      setSuggestions([]);
      setSelectedSlotId("");
      setError(null);
      setLoading(false);
      return;
    }

    setDate(formatDateInput(new Date(), "America/Bogota"));
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadSlots = async () => {
      const response = await fetchWithRetry(`/api/slots?date=${date}`);
      if (response.ok) {
        const data = (await response.json()) as { slots: Slot[] };
        setSlots(data.slots);
      }
    };

    void loadSlots();
  }, [date, open]);

  if (!open) {
    return null;
  }

  const submit = async () => {
    if (!appointmentId || !selectedSlotId) {
      setError("Selecciona un slot disponible.");
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestions([]);
    const response = await fetchWithTimeout(`/api/appointments/${appointmentId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSlotId: selectedSlotId }),
    });

    if (response.ok) {
      const updated = (await response.json()) as RescheduledAppointment;
      onUpdated?.(updated);
      onClose();
      setSelectedSlotId("");
    } else {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        suggestions?: Array<{ id: string; startAt: string; endAt: string }>;
      } | null;
      setError(body?.error ?? "No se pudo reprogramar.");
      setSuggestions(body?.suggestions ?? []);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reprogramar turno</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Selecciona un nuevo horario</h3>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-surface-muted"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Fecha
            <input
              type="date"
              className="input mt-2"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Slot disponible
            <select
              className="input mt-2"
              value={selectedSlotId}
              onChange={(event) => setSelectedSlotId(event.target.value)}
            >
              <option value="">Selecciona un horario</option>
              {slots.map((slot) => {
                const start = new Date(slot.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
                const end = new Date(slot.endAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
                return (
                  <option key={slot.id} value={slot.id}>
                    {start} - {end} · {slot.professional.user.name} {slot.professional.user.lastName}
                  </option>
                );
              })}
            </select>
          </label>
          {suggestions.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200">
              <p className="font-semibold text-slate-700 dark:text-slate-100">Próximos slots sugeridos</p>
              <ul className="mt-2 space-y-1">
                {suggestions.map((slot) => (
                  <li key={slot.id}>
                    {new Date(slot.startAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} -{" "}
                    {new Date(slot.endAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary px-4 py-2 text-xs"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-xs"
            onClick={submit}
            disabled={loading}
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

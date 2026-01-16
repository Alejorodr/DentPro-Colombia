"use client";

import { useEffect, useMemo, useState } from "react";

import { X } from "@/components/ui/Icon";
import { AppointmentStatus } from "@prisma/client";

import { formatDateInput } from "@/lib/dates/tz";

type PatientOption = { id: string; user: { name: string; lastName: string; email: string } };

type ProfessionalOption = {
  id: string;
  user: { name: string; lastName: string };
  specialty?: { name: string } | null;
};

type ServiceOption = { id: string; name: string };

type SlotOption = {
  id: string;
  startAt: string;
  endAt: string;
  professional: { id: string; user: { name: string; lastName: string } };
};

type AppointmentForm = {
  patientId: string;
  professionalId: string;
  serviceId: string;
  date: string;
  slotId: string;
  reason: string;
  status: AppointmentStatus;
};

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NewAppointmentModal({ open, onClose, onCreated }: NewAppointmentModalProps) {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [form, setForm] = useState<AppointmentForm>({
    patientId: "",
    professionalId: "",
    serviceId: "",
    date: formatDateInput(new Date(), "America/Bogota"),
    slotId: "",
    reason: "",
    status: AppointmentStatus.PENDING,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === form.serviceId),
    [services, form.serviceId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const loadOptions = async () => {
      const [patientsResponse, professionalsResponse, servicesResponse] = await Promise.all([
        fetch("/api/patients?active=true&pageSize=50"),
        fetch("/api/professionals?pageSize=50"),
        fetch("/api/services?active=true&pageSize=50"),
      ]);

      if (patientsResponse.ok) {
        const data = (await patientsResponse.json()) as { data: PatientOption[] };
        setPatients(data.data ?? []);
      }
      if (professionalsResponse.ok) {
        const data = (await professionalsResponse.json()) as { data: ProfessionalOption[] };
        setProfessionals(data.data ?? []);
      }
      if (servicesResponse.ok) {
        const data = (await servicesResponse.json()) as { data: ServiceOption[] };
        setServices(data.data ?? []);
      }
    };

    void loadOptions();
  }, [open]);

  useEffect(() => {
    if (!open || !form.date) {
      return;
    }

    const loadSlots = async () => {
      const params = new URLSearchParams({ date: form.date });
      if (form.serviceId) {
        params.set("serviceId", form.serviceId);
      }
      const response = await fetch(`/api/slots?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as { slots: SlotOption[] };
        const filteredSlots = form.professionalId
          ? data.slots.filter((slot) => slot.professional.id === form.professionalId)
          : data.slots;
        setSlots(filteredSlots);
      }
    };

    void loadSlots();
  }, [form.date, form.professionalId, form.serviceId, open]);

  if (!open) {
    return null;
  }

  const submit = async () => {
    if (!form.patientId || !form.slotId || !form.serviceId) {
      setError("Paciente, servicio y slot son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: form.patientId,
        professionalId: form.professionalId || undefined,
        timeSlotId: form.slotId,
        serviceId: form.serviceId,
        reason: form.reason || selectedService?.name || "Cita",
        status: form.status,
      }),
    });

    if (response.ok) {
      onCreated();
      onClose();
      setForm({
        patientId: "",
        professionalId: "",
        serviceId: "",
        date: form.date,
        slotId: "",
        reason: "",
        status: AppointmentStatus.PENDING,
      });
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo crear el turno.");
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nuevo turno</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Agendar cita</h3>
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
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Paciente
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.patientId}
              onChange={(event) => setForm((prev) => ({ ...prev, patientId: event.target.value }))}
            >
              <option value="">Selecciona paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.user.name} {patient.user.lastName} · {patient.user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Servicio
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.serviceId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  serviceId: event.target.value,
                  reason: services.find((service) => service.id === event.target.value)?.name ?? "",
                }))
              }
            >
              <option value="">Selecciona servicio</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Profesional (opcional)
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.professionalId}
              onChange={(event) => setForm((prev) => ({ ...prev, professionalId: event.target.value }))}
            >
              <option value="">Cualquiera</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.user.name} {professional.user.lastName} · {professional.specialty?.name ?? ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Fecha
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Slot
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.slotId}
              onChange={(event) => setForm((prev) => ({ ...prev, slotId: event.target.value }))}
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
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Estado inicial
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as AppointmentStatus }))}
            >
              <option value={AppointmentStatus.PENDING}>Pendiente</option>
              <option value={AppointmentStatus.CONFIRMED}>Confirmada</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 md:col-span-2">
            Motivo
            <input
              type="text"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Motivo de la cita"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
            onClick={submit}
            disabled={loading}
          >
            Crear turno
          </button>
        </div>
      </div>
    </div>
  );
}

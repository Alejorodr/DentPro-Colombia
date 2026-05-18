"use client";

import { useEffect, useMemo, useState } from "react";

import { X } from "@/components/ui/Icon";
import { AppointmentStatus } from "@prisma/client";

import { formatDateInput } from "@/lib/dates/tz";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

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
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [form, setForm] = useState<AppointmentForm>({
    patientId: "",
    professionalId: "",
    serviceId: "",
    date: formatDateInput(new Date(), "America/Bogota"),
    slotId: "",
    reason: "",
    status: AppointmentStatus.SCHEDULED,
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
      const [professionalsResponse, servicesResponse] = await Promise.all([
        fetchWithRetry("/api/professionals?pageSize=50"),
        fetchWithRetry("/api/services?active=true&pageSize=50"),
      ]);

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
    if (!open) {
      return;
    }
    const query = patientSearch.trim();
    if (query.length < 2) {
      setPatientResults([]);
      setIsSearchingPatients(false);
      setPatientSearchError(null);
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      setIsSearchingPatients(true);
      setPatientSearchError(null);
      const params = new URLSearchParams({
        active: "true",
        pageSize: "10",
        q: query,
      });
      try {
        const response = await fetchWithRetry(`/api/patients?${params.toString()}`);
        if (!response.ok) {
          throw new Error("No se pudo buscar pacientes.");
        }
        const data = (await response.json()) as { data: PatientOption[] };
        if (!cancelled) {
          setPatientResults(data.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setPatientResults([]);
          setPatientSearchError("No se pudo buscar pacientes. Intenta de nuevo.");
        }
      } finally {
        if (!cancelled) {
          setIsSearchingPatients(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [open, patientSearch]);

  useEffect(() => {
    if (!open || !form.date) {
      return;
    }

    const loadSlots = async () => {
      const params = new URLSearchParams({ date: form.date });
      if (form.serviceId) {
        params.set("serviceId", form.serviceId);
      }
      const response = await fetchWithRetry(`/api/slots?${params.toString()}`);
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

  const resetPatientState = () => {
    setPatientSearch("");
    setPatientResults([]);
    setSelectedPatient(null);
    setPatientSearchError(null);
    setForm((prev) => ({ ...prev, patientId: "" }));
  };

  const handleClose = () => {
    resetPatientState();
    onClose();
  };

  const submit = async () => {
    if (!form.patientId || !form.slotId || !form.serviceId) {
      setError("Paciente, servicio y slot son obligatorios.");
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetchWithTimeout("/api/appointments", {
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
      handleClose();
      setForm({
        patientId: "",
        professionalId: "",
        serviceId: "",
        date: form.date,
        slotId: "",
        reason: "",
        status: AppointmentStatus.SCHEDULED,
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
            onClick={handleClose}
            aria-label="Cerrar"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Paciente
            {selectedPatient ? (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200">
                <p className="font-medium">
                  {selectedPatient.user.name} {selectedPatient.user.lastName}
                </p>
                <p className="text-xs normal-case text-slate-500 dark:text-slate-400">{selectedPatient.user.email}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold normal-case text-brand-teal underline"
                  onClick={resetPatientState}
                  aria-label="Cambiar paciente seleccionado"
                >
                  Cambiar paciente
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <input
                  id="new-appointment-patient-search"
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  placeholder="Buscar por nombre, apellido o correo"
                />
                <div className="mt-2 min-h-6 text-xs normal-case text-slate-500 dark:text-slate-400">
                  {isSearchingPatients ? <p>Buscando pacientes...</p> : null}
                  {patientSearchError ? <p className="text-red-600">{patientSearchError}</p> : null}
                  {!isSearchingPatients &&
                  !patientSearchError &&
                  patientSearch.trim().length >= 2 &&
                  patientResults.length === 0 ? (
                    <p>Sin resultados para tu búsqueda.</p>
                  ) : null}
                  {!isSearchingPatients && patientSearch.trim().length < 2 ? (
                    <p>Escribe al menos 2 caracteres para buscar.</p>
                  ) : null}
                </div>
                {patientResults.length > 0 ? (
                  <ul className="mt-2 max-h-44 overflow-auto rounded-xl border border-slate-200 dark:border-surface-muted">
                    {patientResults.map((patient) => (
                      <li key={patient.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm normal-case text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-surface-base"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setForm((prev) => ({ ...prev, patientId: patient.id }));
                            setPatientSearch(`${patient.user.name} ${patient.user.lastName}`);
                            setPatientResults([]);
                            setPatientSearchError(null);
                          }}
                        >
                          <span className="block font-medium">
                            {patient.user.name} {patient.user.lastName}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{patient.user.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
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
            Horario disponible
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
            {form.date && slots.length === 0 ? (
              <p className="mt-1 text-xs normal-case text-amber-600 dark:text-amber-400">
                No hay horarios disponibles para esta fecha. Prueba con otra fecha o cambia el profesional.
              </p>
            ) : null}
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Estado inicial
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as AppointmentStatus }))}
            >
              <option value={AppointmentStatus.SCHEDULED}>Pendiente</option>
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
            onClick={handleClose}
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

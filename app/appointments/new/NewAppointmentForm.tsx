"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { UserRole } from "@/lib/auth/roles";
import { fetchAllPages, fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import {
  ACTIVE_CAP_MESSAGE,
  MAX_ACTIVE_APPOINTMENTS_PER_PATIENT,
  isSlotBookableByPatient,
} from "@/lib/appointments/booking-limits";
import { CLINIC_TIME_ZONE } from "@/lib/dates/tz";

type Professional = {
  id: string;
  user: { name: string; lastName: string };
};

type TimeSlot = {
  id: string;
  startAt: string;
  endAt: string;
  professional: Professional;
};

type Service = {
  id: string;
  name: string;
  priceCents: number;
};

interface NewAppointmentFormProps {
  role: UserRole;
  /** Active future appointments the patient already holds (only relevant for PACIENTE). */
  activeAppointmentsCount?: number;
}

export function NewAppointmentForm({ role, activeAppointmentsCount = 0 }: NewAppointmentFormProps) {
  const isPatient = role === "PACIENTE";
  const atActiveCap = isPatient && activeAppointmentsCount >= MAX_ACTIVE_APPOINTMENTS_PER_PATIENT;
  const searchParams = useSearchParams();
  const preselectedProfessionalId = searchParams.get("professionalId") ?? "";

  const [allProfessionals, setAllProfessionals] = useState<Professional[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionalId, setProfessionalId] = useState(preselectedProfessionalId);
  const [serviceId, setServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [patientId, setPatientId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void fetchAllPages<{ id: string; user: Professional["user"] }>("/api/professionals")
      .then((items) => setAllProfessionals((items ?? []).map((item) => ({ id: item.id, user: item.user }))))
      .catch(() => setAllProfessionals([]));
  }, []);

  useEffect(() => {
    void fetchAllPages<Service>("/api/services?active=true")
      .then((items) => setServices(items ?? []))
      .catch(() => setServices([]));
  }, []);

  // A service change always invalidates the chosen slot (slots are service-scoped), but it
  // must NOT blindly drop the professional: picking a service is mandatory, so clearing here
  // would wipe the `?professionalId=…` preselection on the user's very first interaction.
  // The value-comparison ref also keeps React Strict Mode's double-effect from firing at mount.
  const previousServiceId = useRef(serviceId);
  useEffect(() => {
    if (previousServiceId.current === serviceId) {
      return;
    }
    previousServiceId.current = serviceId;
    setTimeSlotId("");
  }, [serviceId]);

  // Drop the professional only once the freshly loaded slots prove they do not offer the
  // selected service. While slots are still loading (or empty) the selection is kept.
  useEffect(() => {
    if (!professionalId || slots.length === 0) {
      return;
    }
    if (slots.some((slot) => slot.professional.id === professionalId)) {
      return;
    }
    setProfessionalId("");
    setTimeSlotId("");
  }, [slots, professionalId]);

  useEffect(() => {
    if (!serviceId || !selectedDate) {
      setSlots([]);
      setTimeSlotId("");
      return;
    }

    const params = new URLSearchParams({ serviceId, date: selectedDate });
    void fetchWithRetry(`/api/slots?${params.toString()}`)
      .then((res) => res.json())
      .then((payload) => {
        const nextSlots: TimeSlot[] = payload.slots ?? [];
        // Patients cannot book inside the lead time window (the API filters too).
        setSlots(isPatient ? nextSlots.filter((slot) => isSlotBookableByPatient(slot.startAt)) : nextSlots);
      })
      .catch(() => setSlots([]));
  }, [serviceId, selectedDate, isPatient]);

  const serviceProfessionals = useMemo(() => {
    const uniqueIds = new Set(slots.map((slot) => slot.professional.id));
    const fromSlots = Array.from(uniqueIds)
      .map((id) => slots.find((slot) => slot.professional.id === id)?.professional)
      .filter((item): item is Professional => Boolean(item));
    return fromSlots.length > 0 ? fromSlots : allProfessionals;
  }, [slots, allProfessionals]);

  const availableSlots = useMemo(() => {
    const byService = slots.filter((slot) => !professionalId || slot.professional.id === professionalId);
    return byService;
  }, [slots, professionalId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const response = await fetchWithTimeout("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timeSlotId,
        professionalId: professionalId || undefined,
        patientId: role !== "PACIENTE" ? patientId || undefined : undefined,
        serviceId,
        reason,
        notes,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setStatus(data?.error ?? "No se pudo crear la cita.");
      return;
    }

    setStatus("Cita creada correctamente.");
    setTimeSlotId("");
    setReason("");
    setNotes("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Servicio
          <select
            value={serviceId}
            onChange={(event) => {
              const nextServiceId = event.target.value;
              setServiceId(nextServiceId);
              const service = services.find((item) => item.id === nextServiceId);
              if (service && !reason) {
                setReason(service.name);
              }
            }}
            className="input"
            required
          >
            <option value="">Selecciona</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Fecha
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setTimeSlotId("");
            }}
            className="input"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Profesional
          <select
            value={professionalId}
            onChange={(event) => {
              setProfessionalId(event.target.value);
              setTimeSlotId("");
            }}
            className="input"
            required
          >
            <option value="">Selecciona</option>
            {serviceProfessionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.user.name} {professional.user.lastName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Slot disponible
          <select
            value={timeSlotId}
            onChange={(event) => setTimeSlotId(event.target.value)}
            className="input"
            required
          >
            <option value="">Selecciona</option>
            {availableSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {new Date(slot.startAt).toLocaleTimeString("es-CO", { timeZone: CLINIC_TIME_ZONE, hour: "2-digit", minute: "2-digit" })} - {new Date(slot.endAt).toLocaleTimeString("es-CO", { timeZone: CLINIC_TIME_ZONE, hour: "2-digit", minute: "2-digit" })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {role !== "PACIENTE" ? (
        <label className="space-y-2 text-sm font-semibold text-slate-700">
          ID del paciente
          <input
            type="text"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            className="input"
            placeholder="ID del paciente"
            required
          />
        </label>
      ) : null}

      <label className="space-y-2 text-sm font-semibold text-slate-700">
        Motivo
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="input"
          required
        />
      </label>

      <label className="space-y-2 text-sm font-semibold text-slate-700">
        Notas
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="input min-h-[120px]"
        />
      </label>

      {status ? (
        <p className="text-sm font-semibold text-brand-teal">{status}</p>
      ) : null}

      {atActiveCap ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {ACTIVE_CAP_MESSAGE}
        </div>
      ) : null}

      <button type="submit" className="btn-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={atActiveCap}>
        Confirmar turno
      </button>
    </form>
  );
}

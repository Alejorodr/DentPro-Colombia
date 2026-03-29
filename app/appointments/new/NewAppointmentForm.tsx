"use client";

import { useEffect, useMemo, useState } from "react";

import type { UserRole } from "@/lib/auth/roles";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

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
}

export function NewAppointmentForm({ role }: NewAppointmentFormProps) {
  const [allProfessionals, setAllProfessionals] = useState<Professional[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [patientId, setPatientId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void fetchWithRetry("/api/professionals?pageSize=100")
      .then((res) => res.json())
      .then((payload) => setAllProfessionals((payload.data ?? []).map((item: { id: string; user: Professional["user"] }) => ({ id: item.id, user: item.user }))))
      .catch(() => setAllProfessionals([]));
  }, []);

  useEffect(() => {
    void fetchWithRetry("/api/services?active=true&pageSize=50")
      .then((res) => res.json())
      .then((payload) => setServices(payload.data ?? []))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    setProfessionalId("");
    setTimeSlotId("");
  }, [serviceId]);

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
        const nextSlots = payload.slots ?? [];
        setSlots(nextSlots);
      })
      .catch(() => setSlots([]));
  }, [serviceId, selectedDate]);

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
                {new Date(slot.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(slot.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

      <button type="submit" className="btn-primary">
        Confirmar turno
      </button>
    </form>
  );
}

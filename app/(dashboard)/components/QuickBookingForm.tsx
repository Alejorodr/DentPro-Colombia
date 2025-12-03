"use client";

import { useAuthRole } from "@/app/providers";
import { useBookingForm } from "@/hooks/useBookingForm";
import { listPatients } from "@/lib/api/patients";
import { listSchedules } from "@/lib/api/schedules";
import type { PatientSummary, ScheduleSlot } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";

const services = [
  { value: "preventiva", label: "Odontología preventiva" },
  { value: "ortodoncia", label: "Ortodoncia" },
  { value: "rehabilitacion", label: "Rehabilitación oral" },
];

export function QuickBookingForm() {
  const { role } = useAuthRole();
  const { handleSubmit, isPending, isSuccess, error } = useBookingForm();
  const { data: patients, isLoading: isLoadingPatients } = useQuery<PatientSummary[]>({
    queryKey: ["patients"],
    queryFn: listPatients,
  });
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery<ScheduleSlot[]>({
    queryKey: ["schedules"],
    queryFn: listSchedules,
  });

  return (
    <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-surface-elevated" onSubmit={handleSubmit}>
      <div>
        <h3 className="text-lg font-semibold">Solicitar nueva cita</h3>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Comparte tus datos de contacto y la recepción te confirmará disponibilidad.
        </p>
        {role && role !== "patient" ? (
          <p className="mt-1 text-xs text-brand-teal dark:text-accent-cyan">
            Estás registrando una solicitud en nombre de un paciente.
          </p>
        ) : null}
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-semibold" htmlFor="dashboard-name">
          Nombre completo
        </label>
        <input
          id="dashboard-name"
          name="name"
          className="input"
          placeholder="Ej. Mariana López"
          required
          disabled={isPending}
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-semibold" htmlFor="dashboard-email">
          Correo electrónico
        </label>
        <input
          id="dashboard-email"
          name="email"
          type="email"
          className="input"
          placeholder="Ej. nombre@correo.com"
          disabled={isPending}
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-semibold" htmlFor="dashboard-phone">
          Celular
        </label>
        <input
          id="dashboard-phone"
          name="phone"
          className="input"
          placeholder="Ej. 300 123 4567"
          required
          disabled={isPending}
        />
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-semibold" htmlFor="dashboard-service">
          Servicio
        </label>
        <select id="dashboard-service" name="service" className="input" required disabled={isPending} defaultValue="">
          <option value="" disabled>
            Selecciona una opción
          </option>
          {services.map((service) => (
            <option key={service.value} value={service.value}>
              {service.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-semibold" htmlFor="dashboard-patient">
          Paciente existente (opcional)
        </label>
        <select
          id="dashboard-patient"
          name="patientId"
          className="input"
          defaultValue=""
          disabled={isPending || isLoadingPatients}
        >
          <option value="">Nuevo paciente</option>
          {(patients ?? []).map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name} {patient.phone ? `(${patient.phone})` : ""}
            </option>
          ))}
        </select>
        {isLoadingPatients ? (
          <p className="text-xs text-slate-500">Cargando pacientes...</p>
        ) : null}
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-semibold" htmlFor="dashboard-schedule">
          Horario disponible (opcional)
        </label>
        <select
          id="dashboard-schedule"
          name="scheduleId"
          className="input"
          defaultValue=""
          disabled={isPending || isLoadingSchedules}
        >
          <option value="">Selecciona un horario</option>
          {(schedules ?? [])
            .filter((slot) => slot.available)
            .map((slot) => {
              const start = new Date(slot.start).toLocaleString();
              const end = new Date(slot.end).toLocaleTimeString();
              return (
                <option key={slot.id} value={slot.id}>
                  {start} - {end}
                </option>
              );
            })}
        </select>
        {isLoadingSchedules ? (
          <p className="text-xs text-slate-500">Cargando horarios...</p>
        ) : null}
      </div>
      <div className="grid gap-1">
        <label className="text-xs font-semibold" htmlFor="dashboard-preferred-date">
          Fecha preferida
        </label>
        <input
          id="dashboard-preferred-date"
          name="preferredDate"
          type="date"
          className="input"
          disabled={isPending}
        />
      </div>
      <textarea
        name="message"
        rows={3}
        className="input"
        placeholder="Notas adicionales"
        disabled={isPending}
      ></textarea>
      <button type="submit" className="btn-primary justify-center" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar solicitud"}
      </button>
      <div aria-live={error ? "assertive" : "polite"} role={error ? "alert" : "status"}>
        {error ? (
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        ) : isSuccess ? (
          <p className="text-sm font-medium text-brand-teal dark:text-accent-cyan">
            Solicitud recibida. Te contactaremos pronto.
          </p>
        ) : null}
      </div>
    </form>
  );
}


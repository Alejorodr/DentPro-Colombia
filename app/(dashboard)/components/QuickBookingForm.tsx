"use client";

import { useAuthRole } from "@/app/providers";
import { useBookingForm } from "@/hooks/useBookingForm";

const services = [
  { value: "preventiva", label: "Odontología preventiva" },
  { value: "ortodoncia", label: "Ortodoncia" },
  { value: "rehabilitacion", label: "Rehabilitación oral" },
];

export function QuickBookingForm() {
  const { role } = useAuthRole();
  const { handleSubmit, isPending, isSuccess } = useBookingForm();

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
      {isSuccess ? (
        <p className="text-sm font-medium text-brand-teal dark:text-accent-cyan">Solicitud recibida. Te contactaremos pronto.</p>
      ) : null}
    </form>
  );
}


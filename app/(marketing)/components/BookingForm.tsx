"use client";

import { FormEvent, useState } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface BenefitItem {
  icon: string;
  text: string;
}

interface BookingFormProps {
  title: string;
  description: string;
  selectLabel: string;
  options: SelectOption[];
  benefitsTitle: string;
  benefits: BenefitItem[];
  scheduleNote: string;
  consentNote: string;
}

export function BookingFormSection({
  title,
  description,
  selectLabel,
  options,
  benefitsTitle,
  benefits,
  scheduleNote,
  consentNote,
}: BookingFormProps) {
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("success");
    event.currentTarget.reset();
  };

  return (
    <section id="agenda" className="py-20 transition-colors duration-300 dark:bg-surface-base">
      <div className="container grid gap-12 px-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl bg-gradient p-10 text-white shadow-xl transition-colors duration-500 dark:bg-card-dark dark:text-slate-100 dark:shadow-glow-dark">
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="mt-4 text-base text-brand-light">{description}</p>
          <form className="mt-8 grid gap-6" id="bookingForm" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-semibold">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="input dark:bg-surface-muted dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Ej. Mariana López"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-semibold">
                Celular
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input dark:bg-surface-muted dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Ej. 300 123 4567"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="service" className="text-sm font-semibold">
                {selectLabel}
              </label>
              <select
                id="service"
                name="service"
                className="input dark:bg-surface-muted dark:text-slate-100"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona una opción
                </option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="message" className="text-sm font-semibold">
                Mensaje
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="input dark:bg-surface-muted dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Cuéntanos cómo podemos ayudarte"
              ></textarea>
            </div>
            <button type="submit" className="btn-primary justify-center">
              Solicitar agenda
            </button>
            <p className="text-xs text-brand-light/80">{consentNote}</p>
            <p className="form-feedback text-sm font-semibold text-white" role="status" aria-live="polite">
              {status === "success" ? "¡Gracias! Te contactaremos muy pronto." : ""}
            </p>
          </form>
        </div>
        <div className="card space-y-6 dark:bg-surface-elevated/80">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{benefitsTitle}</h3>
          <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-200">
            {benefits.map((benefit) => (
              <li key={benefit.text} className="flex gap-3">
                <span className="material-symbols-rounded icon-badge text-brand-teal dark:text-accent-cyan" aria-hidden="true">
                  {benefit.icon}
                </span>
                <span>{benefit.text}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-brand-light/70 p-6 text-sm text-slate-700 transition-colors duration-300 dark:border dark:border-accent-cyan/15 dark:bg-surface-muted/80 dark:text-slate-200">
            <p className="font-semibold text-brand-indigo dark:text-accent-cyan">Horario extendido</p>
            <p className="mt-2">{scheduleNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

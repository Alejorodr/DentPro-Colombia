"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useBookingForm } from "@/hooks/useBookingForm";

import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";

interface SelectOption {
  value: string;
  label: string;
}

interface BenefitItem {
  icon: MarketingIconName;
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
  const { handleSubmit, isSuccess, isPending, error } = useBookingForm();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [publicSlots, setPublicSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(false);

  const validateForm = (form: HTMLFormElement) => {
    const errors: Record<string, string> = {};
    const name = (form.elements.namedItem("name") as HTMLInputElement | null)?.value ?? "";
    const email = (form.elements.namedItem("email") as HTMLInputElement | null)?.value ?? "";
    const phone = (form.elements.namedItem("phone") as HTMLInputElement | null)?.value ?? "";

    if (name.trim().length < 3) {
      errors.name = "Ingresa tu nombre completo.";
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = "Ingresa un correo válido.";
    }

    if (!/^[0-9+()\s-]{7,}$/.test(phone)) {
      errors.phone = "Incluye un celular válido.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm(event.currentTarget)) {
      return;
    }

    handleSubmit(event);
  };

  const feedbackMessage = error ?? (isSuccess ? "¡Gracias! Te contactaremos muy pronto." : "");
  const feedbackRole = error ? "alert" : "status";
  const feedbackAriaLive = error ? "assertive" : "polite";
  const feedbackClasses = `form-feedback text-sm font-semibold ${
    error ? "text-red-100 dark:text-red-300" : "text-white"
  }`;
  const quickSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 1);

    while (slots.length < 3) {
      const day = candidate.getDay();
      const isSunday = day === 0;
      if (!isSunday) {
        const formatted = candidate.toLocaleDateString("es-CO", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
        slots.push(`${formatted} · ${slots.length === 2 ? "3:00 p. m." : "9:00 a. m."}`);
      }
      candidate.setDate(candidate.getDate() + 1);
    }

    return slots;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPublicSlots = async () => {
      try {
        setSlotsLoading(true);
        setSlotsError(false);
        const response = await fetch("/api/public/slots?limit=3");
        if (!response.ok) {
          throw new Error("slots_error");
        }

        const payload = (await response.json()) as {
          slots?: Array<{ startsAt: string; professional: string; specialty: string }>;
        };

        const mapped = (payload.slots ?? []).map((slot) => {
          const date = new Date(slot.startsAt);
          const day = date.toLocaleDateString("es-CO", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          });
          const hour = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
          return `${day} · ${hour} · ${slot.specialty} · ${slot.professional}`;
        });

        if (!cancelled) {
          setPublicSlots(mapped);
        }
      } catch {
        if (!cancelled) {
          setSlotsError(true);
          setPublicSlots([]);
        }
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    };

    void loadPublicSlots();

    return () => {
      cancelled = true;
    };
  }, []);

  const renderedSlots = publicSlots.length > 0 ? publicSlots : quickSlots;

  return (
    <section id="agenda" className="py-20 transition-colors duration-300 dark:bg-surface-base">
      <div className="container mx-auto grid gap-12 px-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl bg-gradient p-10 text-white shadow-xl transition-colors duration-500 dark:bg-card-dark dark:text-slate-100 dark:shadow-glow-dark">
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="mt-4 text-base text-brand-light">{description}</p>

          {/* Primary action — direct online booking */}
          <div className="mt-6 grid gap-4 rounded-2xl border border-white/25 bg-white/10 p-5" data-testid="availability-block">
            <a
              href="/appointments/new"
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-bold text-brand-teal shadow-md transition hover:bg-brand-light dark:bg-accent-cyan dark:text-slate-900 dark:hover:bg-accent-cyan/90"
            >
              Reservar turno ahora
              <span className="rounded-full border border-brand-teal/30 bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-teal">
                Confirmación inmediata
              </span>
            </a>
            <div>
              <p className="text-xs font-semibold text-brand-light/90 uppercase tracking-wide">
                {publicSlots.length > 0 ? "Próximos turnos disponibles" : "Disponibilidad orientativa"}
              </p>
              <ul className="mt-2 grid gap-1 text-xs text-brand-light">
                {slotsLoading ? <li>Consultando disponibilidad…</li> : null}
                {!slotsLoading && renderedSlots.map((slot) => (
                  <li key={slot}>• {slot}</li>
                ))}
              </ul>
              {slotsError ? (
                <p className="mt-1 text-[11px] text-brand-light/70" role="status" aria-live="polite">
                  Mostramos horarios orientativos mientras actualizamos la agenda en línea.
                </p>
              ) : null}
            </div>
          </div>

          {/* Secondary action — contact request form */}
          <div className="mt-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-light/70">
              O envianos un mensaje
            </p>
            <div className="h-px flex-1 bg-white/20" />
          </div>
          <form
            className="mt-6 grid gap-5"
            id="bookingForm"
            aria-label="Formulario de contacto"
            onSubmit={handleFormSubmit}
          >
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-semibold">
                Nombre completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={`input dark:bg-surface-muted dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  fieldErrors.name ? "border-red-500 ring-1 ring-red-400" : ""
                }`}
                placeholder="Ej. Mariana López"
                required
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name ? (
                <p id="name-error" className="text-xs text-red-100">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <label htmlFor="phone" className="text-sm font-semibold">
                Celular
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className={`input dark:bg-surface-muted dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  fieldErrors.phone ? "border-red-500 ring-1 ring-red-400" : ""
                }`}
                placeholder="Ej. 300 123 4567"
                required
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              />
              {fieldErrors.phone ? (
                <p id="phone-error" className="text-xs text-red-100">
                  {fieldErrors.phone}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-semibold">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`input dark:bg-surface-muted dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  fieldErrors.email ? "border-red-500 ring-1 ring-red-400" : ""
                }`}
                placeholder="Ej. nombre@correo.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email ? (
                <p id="email-error" className="text-xs text-red-100">
                  {fieldErrors.email}
                </p>
              ) : null}
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
                rows={3}
                className="input dark:bg-surface-muted dark:text-slate-100 dark:placeholder:text-slate-500"
                placeholder="Cuéntanos cómo podemos ayudarte"
              ></textarea>
            </div>
            <button type="submit" className="btn-secondary justify-center border-white/60 text-white hover:bg-white/15 dark:text-white" disabled={isPending}>
              {isPending ? "Enviando..." : "Solicitar que me contacten"}
            </button>
            <p className="text-xs text-brand-light/80">{consentNote}</p>
            <p className={feedbackClasses} role={feedbackRole} aria-live={feedbackAriaLive}>
              {feedbackMessage}
            </p>
          </form>
        </div>
        <div className="card space-y-6 dark:bg-surface-elevated/80">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{benefitsTitle}</h3>
          <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-200">
        {benefits.map((benefit) => {
          const BenefitIcon = resolveMarketingIcon(benefit.icon);

              return (
                <li key={benefit.text} className="flex gap-3">
                  <span className="icon-badge text-brand-teal dark:text-accent-cyan">
                    <BenefitIcon className="h-5 w-5" weight="bold" aria-hidden="true" />
                  </span>
                  <span>{benefit.text}</span>
                </li>
              );
            })}
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

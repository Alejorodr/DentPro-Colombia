"use client";

import { useEffect, useMemo, useState } from "react";

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
  benefitsTitle,
  benefits,
  scheduleNote,
}: BookingFormProps) {
  const [publicSlots, setPublicSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(false);

  const quickSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 1);

    while (slots.length < 3) {
      const day = candidate.getDay();
      if (day !== 0) {
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
        if (!response.ok) throw new Error("slots_error");

        const payload = (await response.json()) as {
          slots?: Array<{ startsAt: string; professional: string; specialty: string }>;
        };

        const mapped = (payload.slots ?? []).map((slot) => {
          const date = new Date(slot.startsAt);
          const day = date.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" });
          const hour = date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
          return `${day} · ${hour} · ${slot.specialty} · ${slot.professional}`;
        });

        if (!cancelled) setPublicSlots(mapped);
      } catch {
        if (!cancelled) {
          setSlotsError(true);
          setPublicSlots([]);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };

    void loadPublicSlots();
    return () => { cancelled = true; };
  }, []);

  const renderedSlots = publicSlots.length > 0 ? publicSlots : quickSlots;

  return (
    <section id="agenda" className="py-24 transition-colors duration-300 dark:bg-surface-base">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="badge mx-auto mb-4">Agenda tu cita</p>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-4 text-base text-slate-500 dark:text-slate-300">{description}</p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Left — booking panel con gradiente */}
          <div className="rounded-3xl bg-gradient p-10 text-white shadow-xl transition-colors duration-500 dark:bg-card-dark dark:text-slate-100 dark:shadow-glow-dark">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Reserva tu turno ahora</h3>
              <p className="text-sm text-brand-light/90">
                Confirmación inmediata. Sin esperas ni llamadas.
              </p>
            </div>

            <div className="mt-8 grid gap-4 rounded-2xl border border-white/25 bg-white/10 p-5" data-testid="availability-block">
              <a
                href="/appointments/new"
                className="flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-base font-bold text-brand-teal shadow-md transition hover:bg-brand-light dark:bg-accent-cyan dark:text-slate-900 dark:hover:bg-accent-cyan/90"
              >
                Ver disponibilidad y reservar
                <span className="rounded-full border border-brand-teal/30 bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-teal">
                  Confirma en segundos
                </span>
              </a>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-light/90">
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
                    Mostrando horarios orientativos mientras actualizamos la agenda en línea.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-light/90">Horario</p>
              <p className="mt-1 text-sm text-brand-light/80">{scheduleNote}</p>
            </div>
          </div>

          {/* Right — benefits card */}
          <div className="card space-y-6 dark:bg-surface-elevated/80">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{benefitsTitle}</h3>
            <ul className="space-y-4">
              {benefits.map((benefit) => {
                const BenefitIcon = resolveMarketingIcon(benefit.icon);
                return (
                  <li key={benefit.text} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-200">
                    <span className="icon-badge shrink-0 text-brand-teal dark:text-accent-cyan">
                      <BenefitIcon className="h-5 w-5" weight="bold" aria-hidden="true" />
                    </span>
                    <span>{benefit.text}</span>
                  </li>
                );
              })}
            </ul>
            <div className="rounded-2xl bg-brand-light/70 p-5 transition-colors duration-300 dark:border dark:border-accent-cyan/15 dark:bg-surface-muted/80">
              <p className="text-sm font-semibold text-brand-indigo dark:text-accent-cyan">¿Tienes dudas?</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Escríbenos por{" "}
                <a href="https://wa.me/573237968435" className="font-semibold text-brand-teal hover:underline dark:text-accent-cyan" target="_blank" rel="noopener">
                  WhatsApp
                </a>{" "}
                o llámanos al{" "}
                <a href="tel:+573237968435" className="font-semibold text-brand-teal hover:underline dark:text-accent-cyan">
                  +57 323 796 8435
                </a>
                . Te respondemos de inmediato.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

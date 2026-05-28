"use client";

import { CheckCircle } from "@/components/ui/Icon";

import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";

interface ServiceItem {
  title: string;
  description: string;
  icon: MarketingIconName;
  highlights: string[];
}

interface ServicesProps {
  title: string;
  description: string;
  services: ServiceItem[];
}

export function ServicesSection({ title, description, services }: ServicesProps) {
  return (
    <section id="servicios" className="py-24 transition-colors duration-300 dark:bg-surface-base">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="badge mx-auto mb-4">Tratamientos</p>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-4 text-base text-slate-500 dark:text-slate-300">{description}</p>
        </div>

        {/* Grid: 6 cards en 2 filas de 3, todas con altura uniforme */}
        <div className="mt-14 grid auto-rows-fr gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const ServiceIcon = resolveMarketingIcon(service.icon);

            return (
              <article key={service.title} className="card flex h-full flex-col gap-5">
                {/* Icon */}
                <div className="icon-circle shrink-0">
                  <ServiceIcon className="h-6 w-6" weight="bold" aria-hidden="true" />
                </div>

                {/* Title + description */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{service.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-300">{service.description}</p>
                </div>

                {/* Highlights — flex-1 empuja el CTA siempre al fondo */}
                <ul className="flex-1 space-y-2">
                  {service.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan"
                        weight="fill"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA — siempre al fondo por flex-1 arriba */}
                <a
                  href="/appointments/new"
                  className="btn-secondary w-full justify-center text-sm"
                >
                  Reservar cita
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

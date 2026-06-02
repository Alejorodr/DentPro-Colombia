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
  badge?: string;
  title: string;
  description: string;
  services: ServiceItem[];
}

export function ServicesSection({ badge, title, description, services }: ServicesProps) {
  return (
    <section id="servicios" className="py-24 transition-colors duration-300 dark:bg-surface-base">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl">
          {badge ? <p className="badge mb-4 w-fit">{badge}</p> : null}
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-4 text-base text-slate-500 dark:text-slate-300">{description}</p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const ServiceIcon = resolveMarketingIcon(service.icon);

            return (
              <article key={service.title} className="card flex flex-col gap-4">
                <div className="icon-circle shrink-0 dark:bg-accent-cyan/15 dark:text-accent-cyan">
                  <ServiceIcon className="h-6 w-6" weight="bold" aria-hidden="true" />
                </div>
                <div className="flex flex-1 flex-col">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{service.title}</h3>
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-200">{service.description}</p>
                  <ul className="mt-6 space-y-2 text-sm text-slate-500 dark:text-slate-300">
                    {service.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-teal dark:text-accent-cyan" weight="fill" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-6">
                    <a href="/appointments/new" className="btn-secondary w-full justify-center text-sm">
                      Reservar cita
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

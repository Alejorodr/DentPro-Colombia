interface ServiceItem {
  title: string;
  description: string;
  icon: string;
  highlights: string[];
}

interface ServicesProps {
  title: string;
  description: string;
  services: ServiceItem[];
}

export function ServicesSection({ title, description, services }: ServicesProps) {
  return (
    <section id="servicios" className="py-20 transition-colors duration-300 dark:bg-surface-base">
      <div className="container px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-200">{description}</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article key={service.title} className="card">
              <div className="icon-circle dark:bg-accent-cyan/15 dark:text-accent-cyan">
                <span className="material-symbols-rounded" aria-hidden="true">
                  {service.icon}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{service.title}</h3>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-200">{service.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-500 dark:text-slate-300">
                {service.highlights.map((item) => (
                  <li key={item}>✔️ {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


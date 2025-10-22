interface InfoBarProps {
  location: string;
  schedule: string;
  whatsapp: {
    href: string;
    label: string;
  };
  email: {
    href: string;
    label: string;
  };
  socials: Array<{
    href: string;
    label: string;
    icon: string;
  }>;
}

export function InfoBar({ location, schedule, whatsapp, email, socials }: InfoBarProps) {
  return (
    <div className="border-b border-white/60 bg-white/80 text-sm text-slate-600 backdrop-blur-sm transition-colors duration-300 dark:border-surface-muted/60 dark:bg-surface-base/90 dark:text-slate-200">
      <div className="container mx-auto flex flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-light/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-indigo shadow-sm dark:bg-surface-muted/80 dark:text-accent-cyan">
            <span className="material-symbols-rounded text-base" aria-hidden="true">
              location_on
            </span>
            {location}
          </span>
          <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-300">
            <span className="material-symbols-rounded text-base" aria-hidden="true">
              schedule
            </span>
            {schedule}
          </span>
          <a
            href={whatsapp.href}
            className="inline-flex items-center gap-2 font-semibold text-brand-teal transition hover:text-brand-indigo dark:text-accent-cyan dark:hover:text-accent-cyan/80"
            target="_blank"
            rel="noopener"
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">
              chat
            </span>
            {whatsapp.label}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={email.href}
            className="inline-flex items-center gap-2 font-medium text-slate-500 transition hover:text-brand-teal dark:text-slate-300 dark:hover:text-accent-cyan"
          >
            <span className="material-symbols-rounded text-base" aria-hidden="true">
              mail
            </span>
            {email.label}
          </a>
          <div className="flex items-center gap-2 text-slate-400">
            {socials.map((social) => (
              <a
                key={social.href}
                href={social.href}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 text-lg transition hover:-translate-y-0.5 hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted/80 dark:text-slate-200 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
                target="_blank"
                rel="noopener"
                aria-label={social.label}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  {social.icon}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


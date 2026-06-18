const config: Record<string, { label: string; className: string }> = {
  SCHEDULED:  { label: "Programada",   className: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300" },
  CONFIRMED:  { label: "Confirmada",   className: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan" },
  CHECKED_IN: { label: "En consulta",  className: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan" },
  CANCELLED:  { label: "Cancelada",    className: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500" },
  COMPLETED:  { label: "Completada",   className: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan" },
  NO_SHOW:    { label: "No asistió",   className: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400" },
  Free:       { label: "Disponible",   className: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan" },
  Busy:       { label: "Ocupado",      className: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300" },
  Break:      { label: "En pausa",     className: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400" },
  Offline:    { label: "Sin turno",    className: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500" },
};

export type BadgeVariant = keyof typeof config;

export function StatusBadge({ status }: { status: string }) {
  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

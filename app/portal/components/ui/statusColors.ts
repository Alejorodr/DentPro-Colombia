export interface StatusColorSet {
  label: string;
  badge: string;
  bar: string;
  tint: string;
  text: string;
  border: string;
}

export const STATUS_COLORS: Record<string, StatusColorSet> = {
  SCHEDULED: {
    label: "Programada",
    badge: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-surface-muted",
  },
  CONFIRMED: {
    label: "Confirmada",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  CHECKED_IN: {
    label: "En consulta",
    badge: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan",
    bar: "bg-brand-indigo dark:bg-accent-cyan",
    tint: "bg-brand-light/40 border-brand-indigo/25 dark:bg-brand-teal/15 dark:border-accent-cyan/25",
    text: "text-brand-indigo dark:text-accent-cyan",
    border: "border-brand-indigo/30 dark:border-accent-cyan/30",
  },
  COMPLETED: {
    label: "Completada",
    badge: "bg-brand-light/60 text-brand-indigo dark:bg-brand-teal/10 dark:text-accent-cyan",
    bar: "bg-brand-indigo dark:bg-accent-cyan",
    tint: "bg-brand-light/40 border-brand-indigo/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-indigo dark:text-accent-cyan",
    border: "border-brand-indigo/30 dark:border-accent-cyan/30",
  },
  CANCELLED: {
    label: "Cancelada",
    badge: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-base/60 dark:border-surface-muted",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-300 dark:border-surface-muted",
  },
  NO_SHOW: {
    label: "No asistió",
    badge: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-100 border-slate-300 dark:bg-surface-base/70 dark:border-surface-muted",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-400 dark:border-surface-muted",
  },
  Free: {
    label: "Disponible",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  Busy: {
    label: "Ocupado",
    badge: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-surface-muted",
  },
  Break: {
    label: "En pausa",
    badge: "bg-slate-200 text-slate-500 dark:bg-surface-base/60 dark:text-slate-400",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-100 border-slate-300 dark:bg-surface-base/70 dark:border-surface-muted",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-400 dark:border-surface-muted",
  },
  Offline: {
    label: "Sin turno",
    badge: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-base/60 dark:border-surface-muted",
    text: "text-slate-400 dark:text-slate-500",
    border: "border-slate-300 dark:border-surface-muted",
  },
  available: {
    label: "Disponible",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  busy: {
    label: "Ocupado",
    badge: "bg-slate-100 text-slate-700 dark:bg-surface-muted dark:text-slate-300",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-surface-muted",
  },
  off: {
    label: "Fuera",
    badge: "bg-slate-100 text-slate-400 dark:bg-surface-base dark:text-slate-500",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-base/60 dark:border-surface-muted",
    text: "text-slate-400 dark:text-slate-500",
    border: "border-slate-300 dark:border-surface-muted",
  },
  Active: {
    label: "Activo",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  Inactive: {
    label: "Inactivo",
    badge: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
    bar: "bg-slate-300 dark:bg-slate-600",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-300 dark:border-surface-muted",
  },
  success: {
    label: "success",
    badge: "bg-brand-light text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan",
    bar: "bg-brand-teal dark:bg-accent-cyan",
    tint: "bg-brand-light/60 border-brand-teal/20 dark:bg-brand-teal/10 dark:border-accent-cyan/20",
    text: "text-brand-teal dark:text-accent-cyan",
    border: "border-brand-teal/30 dark:border-accent-cyan/30",
  },
  failure: {
    label: "failure",
    badge: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
    bar: "bg-slate-400 dark:bg-slate-500",
    tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
    text: "text-slate-500 dark:text-slate-400",
    border: "border-slate-300 dark:border-surface-muted",
  },
};

export const DEFAULT_STATUS_COLOR: StatusColorSet = {
  label: "",
  badge: "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-slate-400",
  bar: "bg-slate-300 dark:bg-slate-600",
  tint: "bg-slate-50 border-slate-200 dark:bg-surface-muted/40 dark:border-surface-muted",
  text: "text-slate-500 dark:text-slate-400",
  border: "border-slate-300 dark:border-surface-muted",
};

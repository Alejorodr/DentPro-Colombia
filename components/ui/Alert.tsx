import { type ReactNode } from "react";

type AlertVariant = "error" | "success" | "info";

const variantStyles: Record<AlertVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
  info: "border-slate-200 bg-slate-50 text-slate-700 dark:border-surface-muted dark:bg-surface-muted/40 dark:text-slate-100",
};

interface AlertProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  variant?: AlertVariant;
}

export function Alert({ title, description, children, variant = "info" }: AlertProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${variantStyles[variant]}`} role="alert">
      {title ? <p className="font-semibold">{title}</p> : null}
      {description ? <p className="text-sm">{description}</p> : null}
      {children}
    </div>
  );
}

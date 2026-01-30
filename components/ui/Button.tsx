import type { ButtonHTMLAttributes } from "react";
import { CircleNotch } from "@/components/ui/Icon";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonClasses({ variant = "primary", size = "md", className }: ButtonClassOptions = {}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 disabled:pointer-events-none disabled:opacity-60";
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-brand-teal text-white shadow-lg shadow-brand-teal/30 hover:-translate-y-0.5 hover:shadow-glow dark:bg-accent-cyan dark:text-slate-900",
    outline:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200 dark:hover:bg-surface-muted",
    ghost:
      "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-surface-muted",
  };
  const sizes: Record<ButtonSize, string> = {
    sm: "px-4 py-2 text-xs",
    md: "px-5 py-2.5",
    lg: "px-6 py-3 text-base",
  };

  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  type = "button",
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={isLoading || disabled}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && <CircleNotch className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

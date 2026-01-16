import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs shadow-slate-100/60 transition-colors dark:border-surface-muted/80 dark:bg-surface-elevated/80 dark:shadow-surface-dark ${
        className ?? ""
      }`}
    >
      {children}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CollapsibleCard({ title, description, badge, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs shadow-slate-100/60 transition-colors dark:border-surface-muted/80 dark:bg-surface-elevated/80 dark:shadow-surface-dark">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50/70 dark:hover:bg-surface-muted/20"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {badge && (
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-teal dark:bg-brand-teal/20 dark:text-accent-cyan">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span
          className="flex-shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && <div className="border-t border-slate-100 px-6 py-5 dark:border-surface-muted">{children}</div>}
    </div>
  );
}

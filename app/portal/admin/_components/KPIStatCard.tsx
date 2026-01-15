"use client";

import { TrendUp } from "@phosphor-icons/react";

type KPIStatCardProps = {
  label: string;
  value: string;
  change?: string;
  accent?: string;
};

export function KPIStatCard({ label, value, change, accent }: KPIStatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/60 dark:border-surface-muted/70 dark:bg-surface-elevated/80">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <span className="rounded-full bg-brand-teal/10 px-2 py-1 text-[10px] font-semibold text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
          <TrendUp className="inline h-3 w-3" /> {accent ?? "MTD"}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {change ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{change}</p> : null}
    </div>
  );
}

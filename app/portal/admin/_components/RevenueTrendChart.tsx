"use client";

import { ChartSpark } from "@/app/portal/components/ui/ChartSpark";

type RevenueTrendChartProps = {
  series: number[];
  labels: string[];
  title: string;
  subtitle: string;
  totalLabel: string;
  deltaLabel?: string;
};

export function RevenueTrendChart({ series, labels, title, subtitle, totalLabel, deltaLabel }: RevenueTrendChartProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs shadow-slate-100/60 dark:border-surface-muted/70 dark:bg-surface-elevated/80">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{subtitle}</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totalLabel}</p>
          {deltaLabel ? <p className="text-xs text-emerald-600 dark:text-emerald-400">{deltaLabel}</p> : null}
        </div>
      </div>
      <ChartSpark series={series} labels={labels} ariaLabel={subtitle} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AnalyticsRangeKey } from "@/app/portal/admin/_data/analytics";

const rangeOptions: { value: AnalyticsRangeKey; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "last7", label: "Últimos 7 días" },
  { value: "last30", label: "Últimos 30 días" },
  { value: "mtd", label: "Mes actual" },
  { value: "ytd", label: "Año en curso" },
  { value: "custom", label: "Personalizado" },
];

type PeriodSelectorProps = {
  rangeKey: AnalyticsRangeKey;
  fromInput: string;
  toInput: string;
};

export function PeriodSelector({ rangeKey, fromInput, toInput }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(fromInput);
  const [to, setTo] = useState(toInput);

  useEffect(() => {
    setFrom(fromInput);
    setTo(toInput);
  }, [fromInput, toInput]);

  const params = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);

  const pushParams = (nextParams: URLSearchParams) => {
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleRangeChange = (value: AnalyticsRangeKey) => {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("range", value);
    if (value !== "custom") {
      nextParams.delete("from");
      nextParams.delete("to");
    } else {
      if (from) nextParams.set("from", from);
      if (to) nextParams.set("to", to);
    }
    pushParams(nextParams);
  };

  const handleDateChange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("range", "custom");
    if (nextFrom) {
      nextParams.set("from", nextFrom);
    } else {
      nextParams.delete("from");
    }
    if (nextTo) {
      nextParams.set("to", nextTo);
    } else {
      nextParams.delete("to");
    }
    pushParams(nextParams);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated/80">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Período
        </label>
        <select
          value={rangeKey}
          onChange={(event) => handleRangeChange(event.target.value as AnalyticsRangeKey)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-brand-teal/30 dark:border-surface-muted/70 dark:bg-surface-muted/60 dark:text-slate-200"
        >
          {rangeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Desde
        </label>
        <input
          type="date"
          value={from}
          onChange={(event) => handleDateChange(event.target.value, to)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-brand-teal/30 dark:border-surface-muted/70 dark:bg-surface-muted/60 dark:text-slate-200"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Hasta
        </label>
        <input
          type="date"
          value={to}
          onChange={(event) => handleDateChange(from, event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-brand-teal/30 dark:border-surface-muted/70 dark:bg-surface-muted/60 dark:text-slate-200"
        />
      </div>

      <div className="ml-auto rounded-full bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
        {rangeOptions.find((option) => option.value === rangeKey)?.label}
      </div>
    </div>
  );
}

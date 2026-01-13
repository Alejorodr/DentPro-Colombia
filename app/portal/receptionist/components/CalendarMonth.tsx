"use client";

import { useMemo } from "react";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";

type CalendarMonthProps = {
  month: Date;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
};

const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

export function CalendarMonth({ month, selectedDate, onSelect, onMonthChange }: CalendarMonthProps) {
  const monthLabel = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(month);

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const totalDays = end.getDate();
    const startDay = (start.getDay() + 6) % 7; // Monday = 0

    return { totalDays, startDay };
  }, [month]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const today = new Date();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-surface-muted dark:bg-surface-elevated/80">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-900 dark:border-surface-muted dark:text-slate-300"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Mes anterior"
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <p className="text-sm font-semibold text-slate-800 capitalize dark:text-white">{monthLabel}</p>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-900 dark:border-surface-muted dark:text-slate-300"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Mes siguiente"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2 text-center text-sm">
        {Array.from({ length: days.startDay }).map((_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: days.totalDays }).map((_, index) => {
          const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelect(date)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition ${
                isSelected
                  ? "bg-brand-teal text-white shadow"
                  : isToday
                    ? "border border-brand-teal text-brand-teal"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-surface-muted"
              }`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

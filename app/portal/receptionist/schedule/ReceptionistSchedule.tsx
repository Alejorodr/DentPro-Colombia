"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarMonth } from "@/app/portal/receptionist/components/CalendarMonth";
import { AppointmentTable } from "@/app/portal/receptionist/components/AppointmentTable";
import { Card } from "@/app/portal/components/ui/Card";
import { NewAppointmentModal } from "@/app/portal/receptionist/components/NewAppointmentModal";
import { Skeleton } from "@/app/portal/components/ui/Skeleton";

const viewOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

type ViewMode = (typeof viewOptions)[number]["value"];

type AnalyticsResponse = {
  appointments: Array<{
    id: string;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    startAt: string;
    endAt: string;
    patient: { id: string; name: string } | null;
    professional: { id: string; name: string; specialty: string | null } | null;
    service: { id: string; name: string } | null;
    reason: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type CalendarDaySummary = {
  date: string;
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  checkedIn: number;
};

type CalendarSummaryResponse = {
  days: CalendarDaySummary[];
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function startOfWeek(date: Date) {
  const day = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return start;
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function buildRangeDays(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function ReceptionistSchedule() {
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date());
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [calendarSummary, setCalendarSummary] = useState<Record<string, CalendarDaySummary>>({});

  const range = useMemo(() => {
    if (view === "week") {
      return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) };
    }
    if (view === "month") {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      return { from: start, to: end };
    }
    return { from: selectedDate, to: selectedDate };
  }, [selectedDate, view]);

  const summaryDays = useMemo(() => {
    if (view === "month") {
      return [];
    }
    return buildRangeDays(range.from, range.to);
  }, [range.from, range.to, view]);

  const refresh = useCallback(async (pageOverride?: number) => {
    const params = new URLSearchParams({
      from: formatDateInput(range.from),
      to: formatDateInput(range.to),
      date: formatDateInput(selectedDate),
      page: String(pageOverride ?? page),
      pageSize: "10",
    });
    const response = await fetch(`/api/analytics/receptionist?${params.toString()}`);
    if (response.ok) {
      const payload = (await response.json()) as AnalyticsResponse;
      setData(payload);
    }
  }, [page, range.from, range.to, selectedDate]);

  useEffect(() => {
    setPage(1);
    void refresh(1);
  }, [range.from, range.to, refresh, selectedDate]);

  useEffect(() => {
    void refresh(page);
  }, [page, refresh]);

  useEffect(() => {
    const loadCalendar = async () => {
      const response = await fetch(`/api/analytics/receptionist/calendar?month=${formatMonthInput(month)}`);
      if (response.ok) {
        const payload = (await response.json()) as CalendarSummaryResponse;
        const nextSummary = payload.days.reduce((acc, day) => {
          acc[day.date] = day;
          return acc;
        }, {} as Record<string, CalendarDaySummary>);
        setCalendarSummary(nextSummary);
      }
    };

    void loadCalendar();
  }, [month]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Schedule</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Agenda general</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-indigo/60 dark:border-surface-muted dark:text-slate-200"
            onClick={() => {
              const params = new URLSearchParams({ date: formatDateInput(selectedDate), view });
              window.open(`/portal/receptionist/print?${params.toString()}`, "_blank", "noopener,noreferrer");
            }}
          >
            Print Schedule
          </button>
          <button
            type="button"
            className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-indigo/60"
            onClick={() => setIsNewOpen(true)}
          >
            + New Appointment
          </button>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
        <CalendarMonth
          month={month}
          selectedDate={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            setMonth(new Date(date));
          }}
          onMonthChange={(date) => setMonth(date)}
          daySummary={calendarSummary}
        />
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agenda</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Turnos</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase text-slate-500 dark:border-surface-muted dark:bg-surface-base dark:text-slate-300">
              {viewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setView(option.value)}
                  className={`rounded-full px-3 py-1 ${
                    view === option.value
                      ? "bg-brand-teal text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {view !== "month" ? (
            <div className="grid gap-3 md:grid-cols-3">
              {data ? (
                summaryDays.map((day) => {
                  const key = formatDateInput(day);
                  const summary = calendarSummary[key];
                  return (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs dark:border-surface-muted dark:bg-surface-elevated/70">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {day.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-slate-500">
                        {summary ? `${summary.total} turnos · ${summary.confirmed} confirmados` : "Sin datos"}
                      </p>
                    </div>
                  );
                })
              ) : (
                Array.from({ length: view === "day" ? 1 : 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-16" />
                ))
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Vista mensual disponible en el calendario.</p>
          )}
          {data ? (
            <AppointmentTable
              appointments={data.appointments}
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
              onRefresh={() => refresh(page)}
            />
          ) : (
            <Skeleton className="h-48 w-full" />
          )}
        </Card>
      </section>
      <NewAppointmentModal
        open={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onCreated={() => refresh(1)}
      />
    </div>
  );
}

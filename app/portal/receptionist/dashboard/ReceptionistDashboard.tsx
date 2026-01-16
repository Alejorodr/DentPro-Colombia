"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarCheck, ClipboardText, Clock, UsersFour } from "@/components/ui/Icon";

import { Card } from "@/app/portal/components/ui/Card";
import { StatCard } from "@/app/portal/components/ui/StatCard";
import { AppointmentTable } from "@/app/portal/receptionist/components/AppointmentTable";
import { CalendarMonth } from "@/app/portal/receptionist/components/CalendarMonth";
import { NewAppointmentModal } from "@/app/portal/receptionist/components/NewAppointmentModal";

const viewOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

type ViewMode = (typeof viewOptions)[number]["value"];

type AnalyticsResponse = {
  metrics: {
    totalAppointments: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    cancellations: number;
  };
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
  staffOnDuty: Array<{
    id: string;
    name: string;
    specialty: string | null;
    status: "Free" | "Busy" | "Break" | "Offline";
    slots: number;
  }>;
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

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

export function ReceptionistDashboard() {
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date());
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
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

  const refresh = useCallback(async (pageOverride?: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      from: formatDateInput(range.from),
      to: formatDateInput(range.to),
      date: formatDateInput(selectedDate),
      page: String(pageOverride ?? page),
      pageSize: "8",
    });
    const response = await fetch(`/api/analytics/receptionist?${params.toString()}`);
    if (response.ok) {
      const payload = (await response.json()) as AnalyticsResponse;
      setData(payload);
    }
    setLoading(false);
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

  const stats = data
    ? [
        {
          label: "Total Appointments",
          value: `${data.metrics.totalAppointments}`,
          change: view === "day" ? "Hoy" : view === "week" ? "Semana" : "Mes",
          icon: CalendarCheck,
        },
        {
          label: "Checked In",
          value: `${data.metrics.checkedIn}`,
          change: "Atendidos",
          icon: UsersFour,
        },
        {
          label: "Pending",
          value: `${data.metrics.pending}`,
          change: "En espera",
          icon: Clock,
        },
        {
          label: "Cancellations",
          value: `${data.metrics.cancellations}`,
          change: "Canceladas",
          icon: ClipboardText,
        },
      ]
    : [];

  const scheduleLabel =
    view === "day"
      ? formatLongDate(selectedDate)
      : view === "week"
        ? `Semana del ${range.from.toLocaleDateString("es-CO")}`
        : new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(selectedDate);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
            Today&apos;s Operations
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{scheduleLabel}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
            onClick={() => {
              const params = new URLSearchParams({ date: formatDateInput(selectedDate), view });
              window.open(`/portal/receptionist/print?${params.toString()}`, "_blank", "noopener,noreferrer");
            }}
          >
            Print Schedule
          </button>
          <button
            type="button"
            className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
            onClick={() => setIsNewOpen(true)}
          >
            + New Appointment
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && stats.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-4">Cargando métricas…</Card>
        ) : (
          stats.map((stat) => <StatCard key={stat.label} {...stat} />)
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
        <div className="space-y-4">
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Dentists on Duty
                </p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Equipo disponible</h2>
              </div>
              <span className="text-xs text-slate-400">{formatDateInput(selectedDate)}</span>
            </div>
            <div className="space-y-3">
              {data?.staffOnDuty?.length ? (
                data.staffOnDuty.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-surface-muted"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{staff.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{staff.specialty ?? "Sin especialidad"}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        staff.status === "Free"
                          ? "bg-emerald-100 text-emerald-700"
                          : staff.status === "Busy"
                            ? "bg-amber-100 text-amber-700"
                            : staff.status === "Break"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {staff.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin profesionales cargados.</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agenda</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Appointments</h2>
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
          {data ? (
            <AppointmentTable
              appointments={data.appointments}
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
              onRefresh={() => refresh(page)}
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando agenda…</p>
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

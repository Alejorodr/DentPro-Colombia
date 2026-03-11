"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CalendarMonth } from "@/app/portal/receptionist/components/CalendarMonth";
import { AppointmentTable } from "@/app/portal/receptionist/components/AppointmentTable";
import { Card } from "@/app/portal/components/ui/Card";
import { NewAppointmentModal } from "@/app/portal/receptionist/components/NewAppointmentModal";
import { Skeleton } from "@/app/portal/components/ui/Skeleton";
import { ActivityFeed } from "@/app/portal/components/activity/ActivityFeed";
import { fetchWithRetry } from "@/lib/http";

const viewOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
] as const;

type ViewMode = (typeof viewOptions)[number]["value"];

type AnalyticsResponse = {
  metrics?: {
    totalAppointments: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    completed: number;
    noShow: number;
    cancellations: number;
  };
  appointments: Array<{
    id: string;
    status: "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
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
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => new Date());
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [calendarSummary, setCalendarSummary] = useState<Record<string, CalendarDaySummary>>({});
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupByProfessional, setGroupByProfessional] = useState(false);

  const range = useMemo(() => {
    if (view === "week") return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) };
    if (view === "month") {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      return { from: start, to: end };
    }
    return { from: selectedDate, to: selectedDate };
  }, [selectedDate, view]);

  const summaryDays = useMemo(() => (view === "month" ? [] : buildRangeDays(range.from, range.to)), [range.from, range.to, view]);

  const refresh = useCallback(async (pageOverride?: number) => {
    setError(null);
    const params = new URLSearchParams({
      from: formatDateInput(range.from),
      to: formatDateInput(range.to),
      date: formatDateInput(selectedDate),
      page: String(pageOverride ?? page),
      pageSize: "10",
    });
    const response = await fetchWithRetry(`/api/analytics/receptionist?${params.toString()}`);
    if (!response.ok) {
      setError("No se pudo cargar la agenda. Intenta actualizar.");
      return;
    }
    const payload = (await response.json()) as AnalyticsResponse;
    setData(payload);
  }, [page, range.from, range.to, selectedDate]);

  useEffect(() => {
    setPage(1);
    void refresh(1);
  }, [range.from, range.to, refresh, selectedDate]);

  useEffect(() => { void refresh(page); }, [page, refresh]);

  useEffect(() => {
    const loadCalendar = async () => {
      const response = await fetchWithRetry(`/api/analytics/receptionist/calendar?month=${formatMonthInput(month)}`);
      if (!response.ok) return;
      const payload = (await response.json()) as CalendarSummaryResponse;
      const nextSummary = payload.days.reduce((acc, day) => {
        acc[day.date] = day;
        return acc;
      }, {} as Record<string, CalendarDaySummary>);
      setCalendarSummary(nextSummary);
    };

    void loadCalendar();
  }, [month]);

  const professionalOptions = useMemo(() => {
    const entries = new Map<string, string>();
    for (const appointment of data?.appointments ?? []) {
      if (appointment.professional) entries.set(appointment.professional.id, appointment.professional.name);
    }
    return Array.from(entries.entries());
  }, [data?.appointments]);

  const specialtyOptions = useMemo(() => {
    const specialties = new Set<string>();
    for (const appointment of data?.appointments ?? []) {
      if (appointment.professional?.specialty) specialties.add(appointment.professional.specialty);
    }
    return Array.from(specialties.values());
  }, [data?.appointments]);

  const filteredAppointments = useMemo(() => {
    const list = data?.appointments ?? [];
    return list.filter((appointment) => {
      const matchesProfessional = professionalFilter === "all" || appointment.professional?.id === professionalFilter;
      const matchesSpecialty = specialtyFilter === "all" || appointment.professional?.specialty === specialtyFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "no_show"
          ? appointment.status === "NO_SHOW"
          : appointment.status === statusFilter);
      return matchesProfessional && matchesSpecialty && matchesStatus;
    });
  }, [data?.appointments, professionalFilter, specialtyFilter, statusFilter]);

  return (
    <div className="space-y-6" data-testid="receptionist-schedule-page">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Schedule</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Agenda del día</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/appointments/new" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-700 dark:border-surface-muted dark:text-slate-200">Crear cita</Link>
          <Link href="/portal/receptionist/patients" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-700 dark:border-surface-muted dark:text-slate-200">Buscar paciente</Link>
          <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white" onClick={() => setIsNewOpen(true)}>Registrar paciente / turno</button>
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
        <CalendarMonth
          month={month}
          selectedDate={selectedDate}
          onSelect={(date) => { setSelectedDate(date); setMonth(new Date(date)); }}
          onMonthChange={(date) => setMonth(date)}
          daySummary={calendarSummary}
        />
        <Card className="space-y-4 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agenda</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Turnos ordenados por hora</h2>
            </div>
            <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGroupByProfessional((prev) => !prev)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${groupByProfessional ? "border-brand-teal bg-brand-teal text-white" : "border-slate-200 text-slate-600"}`}
            >
              {groupByProfessional ? "Agrupado por profesional" : "Vista global"}
            </button>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase text-slate-500 dark:border-surface-muted dark:bg-surface-base dark:text-slate-300">
              {viewOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => setView(option.value)} className={`rounded-full px-3 py-1 ${view === option.value ? "bg-brand-teal text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-300"}`}>
                  {option.label}
                </button>
              ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">Profesional
              <select className="input mt-1" value={professionalFilter} onChange={(event) => setProfessionalFilter(event.target.value)}>
                <option value="all">Todos</option>
                {professionalOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">Especialidad
              <select className="input mt-1" value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)}>
                <option value="all">Todas</option>
                {specialtyOptions.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">Estado
              <select className="input mt-1" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">Todos</option>
                <option value="SCHEDULED">Programadas</option>
                <option value="CONFIRMED">Confirmadas</option>
                <option value="COMPLETED">Atendidas</option>
                <option value="CHECKED_IN">En sala</option>
                <option value="CANCELLED">Canceladas</option>
                <option value="no_show">No asistió</option>
              </select>
            </label>
          </div>

          {data?.metrics ? (
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs">Total: {data.metrics.totalAppointments}</div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs">Confirmadas: {data.metrics.confirmed}</div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs">En sala: {data.metrics.checkedIn}</div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs">Atendidas: {data.metrics.completed}</div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs">Canceladas: {data.metrics.cancellations}</div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-xs">No-show: {data.metrics.noShow}</div>
            </div>
          ) : null}

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          {view !== "month" ? (
            <div className="grid gap-3 md:grid-cols-3">
              {data ? summaryDays.map((day) => {
                const key = formatDateInput(day);
                const summary = calendarSummary[key];
                return (
                  <div key={key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs dark:border-surface-muted dark:bg-surface-elevated/70">
                    <p className="font-semibold text-slate-900 dark:text-white">{day.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" })}</p>
                    <p className="text-slate-500">{summary ? `${summary.total} turnos · ${summary.confirmed} confirmados` : "Sin datos"}</p>
                  </div>
                );
              }) : Array.from({ length: view === "day" ? 1 : 7 }).map((_, index) => <Skeleton key={index} className="h-16" />)}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Vista mensual disponible en el calendario.</p>
          )}
          {data ? (
            <AppointmentTable
              appointments={filteredAppointments}
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={setPage}
              onRefresh={() => refresh(page)}
              initialEventsAppointmentId={searchParams.get("appointment")}
              groupByProfessional={groupByProfessional}
            />
          ) : (
            <Skeleton className="h-48 w-full" />
          )}
        </Card>
      </section>
      <ActivityFeed title="Actividad operativa reciente" limit={10} />
      <NewAppointmentModal open={isNewOpen} onClose={() => setIsNewOpen(false)} onCreated={() => refresh(1)} />
    </div>
  );
}

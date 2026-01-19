"use client";

import { useEffect, useMemo, useState } from "react";

import { CalendarBlank } from "@/components/ui/Icon";
import { Skeleton } from "@/app/portal/components/ui/Skeleton";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

interface AvailabilityRule {
  id: string;
  rrule: string;
  startTime: string;
  endTime: string;
  timezone: string;
  active: boolean;
}

interface AvailabilityException {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

interface AvailabilityBlock {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string | null;
}

interface ClinicHoliday {
  id: string;
  date: string;
  name: string;
}

interface AppointmentSummary {
  id: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  timeSlot: { startAt: string; endAt: string };
  patient: { user: { name: string; lastName: string } } | null;
  service: { name: string } | null;
}

export function ProfessionalCalendar() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [holidays, setHolidays] = useState<ClinicHoliday[]>([]);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState({
    rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    startTime: "09:00",
    endTime: "18:00",
    timezone: "America/Bogota",
  });
  const [exceptionForm, setExceptionForm] = useState({
    date: "",
    isAvailable: false,
    startTime: "",
    endTime: "",
    reason: "",
  });
  const [blockForm, setBlockForm] = useState({
    startAt: "",
    endAt: "",
    reason: "",
  });

  const agendaRange = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    const toDateInput = (date: Date) => date.toISOString().slice(0, 10);
    return { from: toDateInput(now), to: toDateInput(end) };
  }, []);

  const loadAvailability = async () => {
    setLoading(true);
    setError(null);
    const [availabilityResponse, appointmentsResponse] = await Promise.all([
      fetchWithRetry("/api/professional/availability?range=30"),
      fetchWithRetry(`/api/appointments?from=${agendaRange.from}&to=${agendaRange.to}`),
    ]);

    if (!availabilityResponse.ok) {
      setError("No se pudo cargar la disponibilidad.");
      setLoading(false);
      return;
    }

    const availabilityData = (await availabilityResponse.json()) as {
      rules: AvailabilityRule[];
      exceptions: AvailabilityException[];
      blocks?: AvailabilityBlock[];
      holidays?: ClinicHoliday[];
      slots: AvailabilitySlot[];
    };

    setRules(availabilityData.rules ?? []);
    setExceptions(availabilityData.exceptions ?? []);
    setBlocks(availabilityData.blocks ?? []);
    setHolidays(availabilityData.holidays ?? []);
    setSlots(availabilityData.slots ?? []);

    if (appointmentsResponse.ok) {
      const appointmentsData = (await appointmentsResponse.json()) as { data?: AppointmentSummary[] };
      setAppointments(appointmentsData.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadAvailability();
  }, []);

  const createRule = async () => {
    const response = await fetchWithTimeout("/api/professional/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rule", ...ruleForm }),
    });
    if (response.ok) {
      setRuleForm({
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        startTime: "09:00",
        endTime: "18:00",
        timezone: "America/Bogota",
      });
      void loadAvailability();
    }
  };

  const createException = async () => {
    const response = await fetchWithTimeout("/api/professional/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "exception", ...exceptionForm }),
    });
    if (response.ok) {
      setExceptionForm({ date: "", isAvailable: false, startTime: "", endTime: "", reason: "" });
      void loadAvailability();
    }
  };

  const createBlock = async () => {
    const response = await fetchWithTimeout("/api/professional/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "block", ...blockForm }),
    });

    if (response.ok) {
      setBlockForm({ startAt: "", endAt: "", reason: "" });
      void loadAvailability();
    } else {
      setError("No se pudo crear el bloqueo.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Calendar</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Availability rules</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Recurring rules</h2>
          <div className="mt-4 space-y-3 text-sm">
            <input
              value={ruleForm.rrule}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, rrule: event.target.value }))}
              className="input"
              placeholder="RRULE"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                type="time"
                value={ruleForm.startTime}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="input"
              />
              <input
                type="time"
                value={ruleForm.endTime}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="input"
              />
            </div>
            <input
              value={ruleForm.timezone}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, timezone: event.target.value }))}
              className="input"
              placeholder="Timezone"
            />
            <button
              type="button"
              onClick={createRule}
              className="btn btn-secondary w-full"
            >
              Save rule
            </button>
          </div>
          <div className="mt-6 space-y-2">
            {loading ? (
              <Skeleton className="h-16" />
            ) : rules.length === 0 ? (
              <p className="text-sm text-slate-500">No rules defined yet.</p>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">{rule.rrule}</p>
                  <p className="text-slate-500">
                    {rule.startTime} - {rule.endTime} ({rule.timezone})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Exceptions</h2>
          <div className="mt-4 space-y-3 text-sm">
            <input
              type="date"
              value={exceptionForm.date}
              onChange={(event) => setExceptionForm((prev) => ({ ...prev, date: event.target.value }))}
              className="input"
            />
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={exceptionForm.isAvailable}
                onChange={(event) => setExceptionForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
                className="h-4 w-4 rounded-sm border-slate-300 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-indigo/60"
              />
              Available exception
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                type="time"
                value={exceptionForm.startTime}
                onChange={(event) => setExceptionForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="input"
              />
              <input
                type="time"
                value={exceptionForm.endTime}
                onChange={(event) => setExceptionForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="input"
              />
            </div>
            <input
              value={exceptionForm.reason}
              onChange={(event) => setExceptionForm((prev) => ({ ...prev, reason: event.target.value }))}
              className="input"
              placeholder="Reason"
            />
            <button
              type="button"
              onClick={createException}
              className="btn btn-secondary w-full"
            >
              Save exception
            </button>
          </div>
          <div className="mt-6 space-y-2">
            {loading ? (
              <Skeleton className="h-16" />
            ) : exceptions.length === 0 ? (
              <p className="text-sm text-slate-500">No exceptions added yet.</p>
            ) : (
              exceptions.map((exception) => (
                <div key={exception.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(exception.date).toLocaleDateString("es-CO")} {exception.isAvailable ? "Available" : "Off"}
                  </p>
                  <p className="text-slate-500">{exception.reason ?? ""}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Bloqueos manuales</h2>
          <div className="mt-4 space-y-3 text-sm">
            <input
              type="datetime-local"
              value={blockForm.startAt}
              onChange={(event) => setBlockForm((prev) => ({ ...prev, startAt: event.target.value }))}
              className="input"
            />
            <input
              type="datetime-local"
              value={blockForm.endAt}
              onChange={(event) => setBlockForm((prev) => ({ ...prev, endAt: event.target.value }))}
              className="input"
            />
            <input
              value={blockForm.reason}
              onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))}
              className="input"
              placeholder="Motivo"
            />
            <button type="button" onClick={createBlock} className="btn btn-secondary w-full">
              Guardar bloqueo
            </button>
          </div>
          <div className="mt-6 space-y-2">
            {loading ? (
              <Skeleton className="h-16" />
            ) : blocks.length === 0 ? (
              <p className="text-sm text-slate-500">No hay bloqueos registrados.</p>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(block.startAt).toLocaleString("es-CO")}
                  </p>
                  <p className="text-slate-500">
                    Hasta {new Date(block.endAt).toLocaleString("es-CO")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <CalendarBlank size={20} className="text-slate-400" />
            <h2 className="text-lg font-semibold">Agenda personal (7 días)</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {loading ? (
              <Skeleton className="h-24" />
            ) : appointments.length === 0 ? (
              <p className="text-sm text-slate-500">No hay turnos próximos.</p>
            ) : (
              appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(appointment.timeSlot.startAt).toLocaleDateString("es-CO")}
                  </p>
                  <p className="text-slate-500">
                    {new Date(appointment.timeSlot.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} ·
                    {" "}
                    {appointment.patient
                      ? `${appointment.patient.user.name} ${appointment.patient.user.lastName}`
                      : "Paciente"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Feriados próximos</h2>
          <div className="mt-4 space-y-3 text-sm">
            {loading ? (
              <Skeleton className="h-16" />
            ) : holidays.length === 0 ? (
              <p className="text-sm text-slate-500">No hay feriados cargados.</p>
            ) : (
              holidays.map((holiday) => (
                <div key={holiday.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(holiday.date).toLocaleDateString("es-CO")}
                  </p>
                  <p className="text-slate-500">{holiday.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <CalendarBlank size={20} className="text-slate-400" />
          <h2 className="text-lg font-semibold">Next 30 days preview</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16" />)
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">No availability generated yet.</p>
          ) : (
            slots.map((slot) => (
              <div key={`${slot.startAt}-${slot.endAt}`} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {new Date(slot.startAt).toLocaleDateString("es-CO")}
                </p>
                <p className="text-slate-500">
                  {new Date(slot.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} -
                  {" "}
                  {new Date(slot.endAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-300/40 dark:bg-rose-900/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type BaselineSchedule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "CHANGES_REQUESTED";
};

type Adjustment = {
  id: string;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "CHANGES_REQUESTED";
  note?: string | null;
};

type Unavailability = {
  id: string;
  type: "VACATION" | "SICK_LEAVE" | "TRAINING" | "ADMIN_TIME" | "PERSONAL_LEAVE" | "INTERNAL_BLOCK" | "OTHER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  fullDay: boolean;
};

const weekDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const scheduleStatusLabels: Record<string, string> = {
  PENDING_CONFIRMATION: "Pendiente de confirmación",
  CONFIRMED: "Confirmado",
  CHANGES_REQUESTED: "Cambios solicitados",
};

const scheduleStatusStyles: Record<string, string> = {
  PENDING_CONFIRMATION: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CHANGES_REQUESTED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const unavailabilityStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
};

const unavailabilityTypeLabels: Record<string, string> = {
  VACATION: "Vacaciones",
  SICK_LEAVE: "Incapacidad médica",
  TRAINING: "Capacitación",
  ADMIN_TIME: "Tiempo administrativo",
  PERSONAL_LEAVE: "Permiso personal",
  INTERNAL_BLOCK: "Bloqueo interno",
  OTHER: "Otro",
};

export function ProfessionalCalendar() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baselineSchedules, setBaselineSchedules] = useState<BaselineSchedule[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [unavailability, setUnavailability] = useState<Unavailability[]>([]);

  const [adjustmentForm, setAdjustmentForm] = useState({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "18:00",
    effectiveFrom: "",
    effectiveTo: "",
    note: "",
  });

  const [blockForm, setBlockForm] = useState({
    entryType: "INTERNAL_BLOCK",
    startsAt: "",
    endsAt: "",
    fullDay: false,
    reason: "",
  });

  const pendingScheduleIds = useMemo(
    () => baselineSchedules.filter((schedule) => schedule.status === "PENDING_CONFIRMATION").map((schedule) => schedule.id),
    [baselineSchedules],
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/professional/schedule");
    if (!response.ok) {
      setError("No se pudo cargar el calendario operativo.");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as {
      baselineSchedules: BaselineSchedule[];
      adjustments: Adjustment[];
      unavailability: Unavailability[];
    };

    setBaselineSchedules(data.baselineSchedules ?? []);
    setAdjustments(data.adjustments ?? []);
    setUnavailability(data.unavailability ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const confirmBaseline = async () => {
    if (!pendingScheduleIds.length) {
      return;
    }

    const response = await fetchWithTimeout("/api/professional/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "confirmSchedule", scheduleIds: pendingScheduleIds }),
    });

    if (response.ok) {
      await loadData();
    } else {
      setError("No se pudo confirmar el horario base.");
    }
  };

  const requestAdjustment = async () => {
    const response = await fetchWithTimeout("/api/professional/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "requestAdjustment",
        dayOfWeek: Number(adjustmentForm.dayOfWeek),
        startTime: adjustmentForm.startTime,
        endTime: adjustmentForm.endTime,
        effectiveFrom: new Date(`${adjustmentForm.effectiveFrom}T00:00:00.000Z`).toISOString(),
        effectiveTo: adjustmentForm.effectiveTo ? new Date(`${adjustmentForm.effectiveTo}T23:59:59.000Z`).toISOString() : null,
        note: adjustmentForm.note || null,
      }),
    });

    if (response.ok) {
      setAdjustmentForm({ dayOfWeek: "1", startTime: "09:00", endTime: "18:00", effectiveFrom: "", effectiveTo: "", note: "" });
      await loadData();
    } else {
      setError("No se pudo registrar la solicitud de ajuste.");
    }
  };

  const createUnavailability = async () => {
    const response = await fetchWithTimeout("/api/professional/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "createUnavailability",
        entryType: blockForm.entryType,
        startsAt: new Date(blockForm.startsAt).toISOString(),
        endsAt: new Date(blockForm.endsAt).toISOString(),
        fullDay: blockForm.fullDay,
        reason: blockForm.reason || null,
      }),
    });

    if (response.ok) {
      setBlockForm({ entryType: "INTERNAL_BLOCK", startsAt: "", endsAt: "", fullDay: false, reason: "" });
      await loadData();
    } else {
      setError("No se pudo registrar la novedad operativa.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agenda clínica</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Horario operativo</h1>
        <p className="text-sm text-slate-500">Confirma tu horario base y registra ausencias o bloques internos.</p>
      </header>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Horario base asignado por administración</h2>
            <p className="text-sm text-slate-500">Este horario define tu disponibilidad estándar para agendamiento.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={confirmBaseline} disabled={!pendingScheduleIds.length || loading}>
            Confirmar horario pendiente
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(baselineSchedules ?? []).map((schedule) => (
            <div key={schedule.id} className="rounded-2xl border border-slate-200 px-3 py-3 text-sm dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-white">{weekDays[schedule.dayOfWeek]} · {schedule.startTime} - {schedule.endTime}</p>
              <p className="text-xs text-slate-500">{schedule.timezone}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${scheduleStatusStyles[schedule.status] ?? "bg-slate-100 text-slate-500"}`}>
                {scheduleStatusLabels[schedule.status] ?? schedule.status}
              </span>
            </div>
          ))}
          {!loading && baselineSchedules.length === 0 ? <p className="text-sm text-slate-500">No tienes horario base asignado aún.</p> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Solicitar ajuste temporal</h2>
          <p className="text-sm text-slate-500">Solicita cambios de horario sin editar reglas técnicas.</p>
          <div className="mt-4 grid gap-3">
            <select className="input" value={adjustmentForm.dayOfWeek} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))}>
              {weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="time" value={adjustmentForm.startTime} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, startTime: event.target.value }))} />
              <input className="input" type="time" value={adjustmentForm.endTime} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, endTime: event.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="date" value={adjustmentForm.effectiveFrom} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, effectiveFrom: event.target.value }))} />
              <input className="input" type="date" value={adjustmentForm.effectiveTo} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, effectiveTo: event.target.value }))} />
            </div>
            <textarea className="input min-h-24" placeholder="Notas" value={adjustmentForm.note} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, note: event.target.value }))} />
            <button type="button" className="btn btn-secondary" onClick={requestAdjustment}>Enviar solicitud</button>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {adjustments.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                <p className="font-semibold">{item.dayOfWeek !== null && item.dayOfWeek !== undefined ? weekDays[item.dayOfWeek] : "Sin día"} · {item.startTime ?? "--:--"} - {item.endTime ?? "--:--"}</p>
                <p className="text-xs text-slate-500">{new Date(item.effectiveFrom).toLocaleDateString("es-CO")} · {scheduleStatusLabels[item.status] ?? item.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Ausencias y bloqueos</h2>
          <p className="text-sm text-slate-500">Vacaciones, incapacidad, capacitación o bloques internos.</p>
          <div className="mt-4 grid gap-3">
            <select className="input" value={blockForm.entryType} onChange={(event) => setBlockForm((prev) => ({ ...prev, entryType: event.target.value }))}>
              <option value="VACATION">Vacaciones</option>
              <option value="SICK_LEAVE">Incapacidad médica</option>
              <option value="TRAINING">Capacitación</option>
              <option value="ADMIN_TIME">Tiempo administrativo</option>
              <option value="PERSONAL_LEAVE">Permiso personal</option>
              <option value="INTERNAL_BLOCK">Bloqueo interno</option>
              <option value="OTHER">Otro</option>
            </select>
            <input className="input" type="datetime-local" value={blockForm.startsAt} onChange={(event) => setBlockForm((prev) => ({ ...prev, startsAt: event.target.value }))} />
            <input className="input" type="datetime-local" value={blockForm.endsAt} onChange={(event) => setBlockForm((prev) => ({ ...prev, endsAt: event.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={blockForm.fullDay} onChange={(event) => setBlockForm((prev) => ({ ...prev, fullDay: event.target.checked }))} />
              Día completo
            </label>
            <textarea className="input min-h-24" placeholder="Nota operativa" value={blockForm.reason} onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))} />
            <button type="button" className="btn btn-secondary" onClick={createUnavailability}>Registrar novedad</button>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {unavailability.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                <p className="font-semibold">{unavailabilityTypeLabels[item.type] ?? item.type} · {item.fullDay ? "Día completo" : "Parcial"}</p>
                <p className="text-xs text-slate-500">{new Date(item.startsAt).toLocaleString("es-CO")} → {new Date(item.endsAt).toLocaleString("es-CO")}</p>
                <p className="text-xs text-slate-500">Estado: {unavailabilityStatusLabels[item.status] ?? item.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

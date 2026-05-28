"use client";

import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@prisma/client";
import type { ProfessionalDashboardAppointment } from "@/app/portal/professional/types";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const PX_PER_MINUTE = 1.25;

const statusBarColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-amber-400",
  CONFIRMED: "bg-emerald-500",
  CHECKED_IN: "bg-cyan-500",
  CANCELLED: "bg-rose-400",
  COMPLETED: "bg-blue-500",
  NO_SHOW: "bg-fuchsia-400",
};

const statusBgColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
  CONFIRMED: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50",
  CHECKED_IN: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800/50",
  CANCELLED: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50",
  COMPLETED: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50",
  NO_SHOW: "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950/30 dark:border-fuchsia-800/50",
};

const statusTextColors: Record<AppointmentStatus, string> = {
  SCHEDULED: "text-amber-800 dark:text-amber-200",
  CONFIRMED: "text-emerald-800 dark:text-emerald-200",
  CHECKED_IN: "text-cyan-800 dark:text-cyan-200",
  CANCELLED: "text-rose-800 dark:text-rose-200",
  COMPLETED: "text-blue-800 dark:text-blue-200",
  NO_SHOW: "text-fuchsia-800 dark:text-fuchsia-200",
};

function toMinutesFromStart(dateStr: string): number {
  const date = new Date(dateStr);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return (hours - GRID_START_HOUR) * 60 + minutes;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface DayScheduleGridProps {
  appointments: ProfessionalDashboardAppointment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  privacyMode?: boolean;
}

export function DayScheduleGrid({ appointments, selectedId, onSelect, privacyMode }: DayScheduleGridProps) {
  const totalHours = GRID_END_HOUR - GRID_START_HOUR;
  const gridHeight = totalHours * 60 * PX_PER_MINUTE;

  const hours = Array.from({ length: totalHours + 1 }, (_, i) => GRID_START_HOUR + i);

  const visibleAppointments = appointments.filter((appt) => {
    const startMin = toMinutesFromStart(appt.startAt);
    return startMin >= 0 && startMin < totalHours * 60;
  });

  return (
    <div className="relative overflow-auto rounded-2xl border border-slate-200 bg-white dark:border-surface-muted/60 dark:bg-surface-muted">
      <div className="flex" style={{ minHeight: `${gridHeight}px` }}>
        {/* Hour labels column */}
        <div className="sticky left-0 z-10 w-12 shrink-0 select-none bg-white dark:bg-surface-muted">
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative border-b border-slate-100 dark:border-surface-muted/60"
              style={{ height: `${60 * PX_PER_MINUTE}px` }}
            >
              <span className="absolute -top-2.5 left-1 text-[10px] font-medium text-slate-400">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {/* Grid area */}
        <div className="relative flex-1">
          {/* Hour separator lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-b border-slate-100 dark:border-surface-muted/60"
              style={{ top: `${(hour - GRID_START_HOUR) * 60 * PX_PER_MINUTE}px` }}
            />
          ))}

          {/* Half-hour lines */}
          {hours.slice(0, -1).map((hour) => (
            <div
              key={`half-${hour}`}
              className="absolute left-0 right-0 border-b border-dashed border-slate-50 dark:border-surface-muted/50"
              style={{ top: `${((hour - GRID_START_HOUR) * 60 + 30) * PX_PER_MINUTE}px` }}
            />
          ))}

          {/* Appointments */}
          {visibleAppointments.map((appt) => {
            const startMin = toMinutesFromStart(appt.startAt);
            const endMin = toMinutesFromStart(appt.endAt);
            const durationMin = Math.max(endMin - startMin, 20);
            const top = startMin * PX_PER_MINUTE;
            const height = durationMin * PX_PER_MINUTE;
            const isSelected = appt.id === selectedId;

            const patientLabel = privacyMode
              ? "Paciente privado"
              : `${appt.patient.name} ${appt.patient.lastName}`.trim();

            return (
              <button
                key={appt.id}
                type="button"
                onClick={() => onSelect(appt.id)}
                style={{ top: `${top}px`, height: `${height}px` }}
                className={cn(
                  "absolute left-1 right-1 flex cursor-pointer overflow-hidden rounded-xl border text-left transition-all",
                  statusBgColors[appt.status],
                  isSelected && "ring-2 ring-brand-indigo ring-offset-1",
                )}
              >
                <div className={cn("w-1 shrink-0 rounded-l-lg", statusBarColors[appt.status])} />
                <div className="min-w-0 flex-1 px-2 py-1">
                  <p className={cn("truncate text-[11px] font-semibold leading-tight", statusTextColors[appt.status])}>
                    {patientLabel}
                  </p>
                  {height >= 28 ? (
                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {formatTime(appt.startAt)} · {appt.serviceName ?? appt.reason}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}

          {appointments.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-slate-400">Sin citas para este día</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

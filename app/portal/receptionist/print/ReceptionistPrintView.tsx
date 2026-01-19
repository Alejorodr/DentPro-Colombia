"use client";

import { useEffect, useMemo, useState } from "react";

import { Table } from "@/app/portal/components/ui/Table";
import { fetchWithRetry } from "@/lib/http";

interface ReceptionistPrintViewProps {
  date?: string;
  view?: string;
}

type AppointmentSummary = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  patient: { name: string } | null;
  professional: { name: string } | null;
  service: { name: string } | null;
  reason: string;
};

type AnalyticsResponse = {
  appointments: AppointmentSummary[];
};

function parseDateString(value?: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function ReceptionistPrintView({ date, view }: ReceptionistPrintViewProps) {
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const selectedDate = useMemo(() => parseDateString(date), [date]);
  const mode = view === "week" || view === "month" || view === "day" ? view : "day";

  useEffect(() => {
    const range = (() => {
      if (mode === "week") {
        return { from: startOfWeek(selectedDate), to: endOfWeek(selectedDate) };
      }
      if (mode === "month") {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        return { from: start, to: end };
      }
      return { from: selectedDate, to: selectedDate };
    })();

    const load = async () => {
      const params = new URLSearchParams({
        from: formatDateInput(range.from),
        to: formatDateInput(range.to),
        date: formatDateInput(selectedDate),
        page: "1",
        pageSize: "50",
      });
      const response = await fetchWithRetry(`/api/analytics/receptionist?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as AnalyticsResponse;
        setAppointments(data.appointments);
        window.print();
      }
    };

    void load();
  }, [mode, selectedDate]);

  return (
    <div className="min-h-screen bg-white px-6 py-6 text-slate-900">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Agenda Recepción</h1>
        <p className="text-sm text-slate-500">{selectedDate.toLocaleDateString("es-CO")}</p>
      </div>
      <Table>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Hora</th>
            <th className="px-4 py-3 font-semibold">Paciente</th>
            <th className="px-4 py-3 font-semibold">Servicio</th>
            <th className="px-4 py-3 font-semibold">Profesional</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm text-slate-600">
          {appointments.map((appointment) => {
            const start = new Date(appointment.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
            const end = new Date(appointment.endAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
            return (
              <tr key={appointment.id} className="bg-white">
                <td className="px-4 py-3 font-semibold text-slate-900">{start} - {end}</td>
                <td className="px-4 py-3">{appointment.patient?.name ?? "-"}</td>
                <td className="px-4 py-3">{appointment.service?.name ?? appointment.reason}</td>
                <td className="px-4 py-3">{appointment.professional?.name ?? "-"}</td>
                <td className="px-4 py-3">{appointment.status}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

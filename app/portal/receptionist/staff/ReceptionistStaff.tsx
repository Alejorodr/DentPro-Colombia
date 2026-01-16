"use client";

import { useEffect, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type StaffItem = {
  id: string;
  name: string;
  specialty: string | null;
  status: "Free" | "Busy" | "Break" | "Offline";
  slots: number;
};

type AnalyticsResponse = {
  staffOnDuty: StaffItem[];
};

export function ReceptionistStaff() {
  const [date, setDate] = useState(() => formatDateInput(new Date()));
  const [staff, setStaff] = useState<StaffItem[]>([]);

  useEffect(() => {
    const loadStaff = async () => {
      const params = new URLSearchParams({ from: date, to: date, date });
      const response = await fetch(`/api/analytics/receptionist?${params.toString()}`);
      if (response.ok) {
        const data = (await response.json()) as AnalyticsResponse;
        setStaff(data.staffOnDuty ?? []);
      }
    };

    void loadStaff();
  }, [date]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Staff</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dentists on Duty</h1>
        </div>
        <input
          type="date"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </section>
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Equipo</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Disponibilidad diaria</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {staff.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No hay profesionales cargados.</p>
          ) : (
            staff.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-xs dark:border-surface-muted dark:bg-surface-base"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{member.specialty ?? "Sin especialidad"}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      member.status === "Free"
                        ? "bg-emerald-100 text-emerald-700"
                        : member.status === "Busy"
                          ? "bg-amber-100 text-amber-700"
                          : member.status === "Break"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Slots del día: {member.slots}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

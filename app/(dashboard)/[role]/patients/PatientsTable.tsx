"use client";

import { useMemo, useState } from "react";

import type { PatientSummary } from "@/lib/api/types";

interface PatientsTableProps {
  patients: PatientSummary[];
}

export function PatientsTable({ patients }: PatientsTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return patients;
    }

    const value = query.toLowerCase();
    return patients.filter((patient) =>
      [patient.name, patient.email, patient.phone].some((field) => field?.toLowerCase().includes(value)),
    );
  }, [patients, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <label className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-surface-muted/70 dark:text-slate-200 dark:ring-surface-muted md:max-w-sm">
          <span className="text-xs font-semibold uppercase tracking-wide">Buscar</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            placeholder="Nombre, correo o teléfono"
          />
        </label>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
          <thead className="sticky top-[4.5rem] z-10 border-b border-slate-200 bg-white/90 text-xs uppercase tracking-wide text-slate-500 backdrop-blur dark:border-surface-muted dark:bg-surface-elevated/90 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Correo</th>
              <th className="px-3 py-2">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500 dark:text-slate-300" colSpan={3}>
                  No hay pacientes que coincidan con tu búsqueda.
                </td>
              </tr>
            ) : (
              filtered.map((patient) => (
                <tr key={patient.id} className="border-b border-slate-100 last:border-0 dark:border-surface-muted">
                  <td className="max-w-[240px] px-3 py-3 font-semibold text-slate-900 dark:text-white">
                    <span className="line-clamp-2 break-words">{patient.name}</span>
                  </td>
                  <td className="max-w-[240px] px-3 py-3">
                    <span className="line-clamp-2 break-words">{patient.email || "Sin correo"}</span>
                  </td>
                  <td className="max-w-[180px] px-3 py-3">
                    <span className="line-clamp-2 break-words">{patient.phone || "Sin teléfono"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

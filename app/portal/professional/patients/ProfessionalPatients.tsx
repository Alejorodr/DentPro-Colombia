"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MagnifyingGlass } from "@/components/ui/Icon";

interface PatientItem {
  id: string;
  name: string;
  lastName: string;
  email: string;
  patientCode?: string | null;
  lastVisit?: string | null;
}

export function ProfessionalPatients() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientItem[]>([]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      const response = await fetch(`/api/professional/patients?q=${encodeURIComponent(query)}&pageSize=50`, {
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data = (await response.json()) as { data: PatientItem[] };
      if (!active) return;
      setPatients(data.data ?? []);
    };

    const timeout = setTimeout(() => {
      void load();
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patients</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Patient list</h1>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="relative max-w-md">
          <MagnifyingGlass className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patients by name, email, or code"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="mt-6 space-y-3">
          {patients.length === 0 ? (
            <p className="text-sm text-slate-500">No patients matched your search.</p>
          ) : (
            patients.map((patient) => (
              <div
                key={patient.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
              >
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {patient.name} {patient.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{patient.email}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>ID: {patient.patientCode ?? "-"}</p>
                  <p>{patient.lastVisit ? `Last visit: ${new Date(patient.lastVisit).toLocaleDateString("es-CO")}` : ""}</p>
                </div>
                <Link
                  href={`/portal/professional/patients/${patient.id}`}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-indigo hover:text-brand-indigo dark:border-slate-700 dark:text-slate-300"
                >
                  Historia clínica
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

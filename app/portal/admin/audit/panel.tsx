"use client";

import { useCallback, useEffect, useState } from "react";

const defaultFilters = {
  patientId: "",
  userId: "",
  from: "",
  to: "",
};

type AccessLogEntry = {
  id: string;
  action: string;
  route: string;
  requestId: string;
  createdAt: string;
  user: { id: string; name: string; role: string };
  patient: { id: string; name: string } | null;
};

export function AdminAuditPanel() {
  const [filters, setFilters] = useState(defaultFilters);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (filters.patientId) query.set("patientId", filters.patientId);
    if (filters.userId) query.set("userId", filters.userId);
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    query.set("pageSize", "20");

    try {
      const response = await fetch(`/api/admin/audit/access-logs?${query.toString()}`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar los logs.");
      }
      const data = (await response.json()) as { data?: AccessLogEntry[] };
      setLogs(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Auditoría clínica</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Registro de accesos</h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wide text-slate-400">Paciente ID</span>
            <input
              value={filters.patientId}
              onChange={(event) => setFilters((prev) => ({ ...prev, patientId: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wide text-slate-400">Usuario ID</span>
            <input
              value={filters.userId}
              onChange={(event) => setFilters((prev) => ({ ...prev, userId: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wide text-slate-400">Desde</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs">
            <span className="font-semibold uppercase tracking-wide text-slate-400">Hasta</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="mt-4 rounded-xl bg-brand-indigo px-4 py-2 text-sm font-semibold text-white"
        >
          Aplicar filtros
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando logs...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500">Sin registros para los filtros actuales.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{log.action}</p>
                    <p className="text-[11px] text-slate-400">{log.route}</p>
                  </div>
                  <p className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString("es-CO")}</p>
                </div>
                <div className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3">
                  <p>
                    Usuario: {log.user.name} ({log.user.role})
                  </p>
                  <p>Paciente: {log.patient ? log.patient.name : "—"}</p>
                  <p>Request ID: {log.requestId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

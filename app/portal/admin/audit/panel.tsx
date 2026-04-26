"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWithRetry } from "@/lib/http";

type AuditStatus = "success" | "failure";

type AuditLogItem = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  targetLabel: string | null;
  status: AuditStatus;
  actor: {
    userId: string | null;
    role: string | null;
    identifier: string | null;
  };
  metadataPreview: string[];
};

type AuditLogsResponse = {
  items: AuditLogItem[];
  nextCursor: string | null;
};

function StatusBadge({ status }: { status: AuditStatus }) {
  const classes =
    status === "success"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${classes}`}>
      {status}
    </span>
  );
}

export function AdminAuditPanel() {
  const [statusFilter, setStatusFilter] = useState<"all" | AuditStatus>("all");
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async ({ cursor, append }: { cursor?: string | null; append: boolean }) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const query = new URLSearchParams();
      query.set("limit", "30");
      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }
      if (cursor) {
        query.set("cursor", cursor);
      }

      try {
        const response = await fetchWithRetry(`/api/admin/audit-logs?${query.toString()}`);
        if (!response.ok) {
          throw new Error("No se pudieron cargar los logs de auditoría.");
        }

        const body = (await response.json()) as AuditLogsResponse;
        setItems((prev) => (append ? [...prev, ...(body.items ?? [])] : (body.items ?? [])));
        setNextCursor(body.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    void fetchLogs({ append: false });
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Auditoría</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Audit trail administrativo</h1>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | AuditStatus)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-950">
        {loading ? (
          <p className="text-sm text-slate-500">Cargando logs...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">No hay eventos de auditoría para el filtro actual.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{item.action}</p>
                    <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("es-CO")}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                  <p>
                    <span className="font-semibold">Recurso:</span> {item.resourceType}
                  </p>
                  <p>
                    <span className="font-semibold">Resource ID:</span> {item.resourceId ?? "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Actor:</span> {item.actor.identifier ?? item.actor.userId ?? "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Rol:</span> {item.actor.role ?? "—"}
                  </p>
                  {item.targetLabel ? (
                    <p className="sm:col-span-2 lg:col-span-1">
                      <span className="font-semibold">Resumen:</span> {item.targetLabel}
                    </p>
                  ) : null}
                </div>

                {item.metadataPreview.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.metadataPreview.map((entry) => (
                      <li key={`${item.id}-${entry}`}>{entry}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}

            {nextCursor ? (
              <button
                type="button"
                onClick={() => void fetchLogs({ cursor: nextCursor, append: true })}
                disabled={loadingMore}
                className="rounded-xl bg-brand-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CaretRight, MagnifyingGlass, WarningCircle } from "@/components/ui/Icon";
import { Card } from "@/app/portal/components/ui/Card";
import { CUPS_GROUPS, CUPS_PROCEDURE_COUNT, CUPS_SOURCE, type CupsProcedure } from "@/lib/regulatory/cups-odontologia";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type ProcedureState = { serviceId: string | null; professionalIds: string[] };
type ServiceOption = { id: string; name: string; active: boolean };
type ProfessionalOption = { id: string; name: string; specialty: string | null };

type CatalogResponse = {
  procedures: Array<ProcedureState & { cupsCode: string }>;
  services: ServiceOption[];
  professionals: ProfessionalOption[];
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Catálogo CUPS en árbol (DOG-42): la clínica marca los procedimientos que presta, elige con qué
 * servicio se agenda cada uno y qué profesionales lo realizan. Cada cambio se guarda al instante.
 */
export function CupsCatalogPanel() {
  const [offered, setOffered] = useState<Record<string, ProcedureState>>({});
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyOffered, setOnlyOffered] = useState(false);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ code: string; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetchWithRetry("/api/admin/cups");
    if (!response.ok) {
      setLoadError("No se pudo cargar el catálogo CUPS.");
      return;
    }
    const data = (await response.json()) as CatalogResponse;
    setOffered(
      Object.fromEntries(
        data.procedures.map((procedure) => [
          procedure.cupsCode,
          { serviceId: procedure.serviceId, professionalIds: procedure.professionalIds },
        ]),
      ),
    );
    setServices(data.services);
    setProfessionals(data.professionals);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (code: string, next: ProcedureState | null) => {
    const previous = offered[code] ?? null;
    setOffered((current) => {
      const copy = { ...current };
      if (next) copy[code] = next;
      else delete copy[code];
      return copy;
    });
    setSavingCode(code);
    setRowError(null);
    setNotice(null);

    const response = await fetchWithTimeout("/api/admin/cups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next ? { cupsCode: code, offered: true, ...next } : { cupsCode: code, offered: false }),
    });

    if (response.ok) {
      const body = (await response.json()) as { createdAssignments: string[] };
      if (body.createdAssignments.length > 0) {
        const names = professionals
          .filter((professional) => body.createdAssignments.includes(professional.id))
          .map((professional) => professional.name);
        const serviceName = services.find((service) => service.id === next?.serviceId)?.name ?? "el servicio";
        setNotice(`${names.join(", ")} ya se puede agendar en ${serviceName}.`);
      }
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setRowError({ code, message: body?.error ?? "No se pudo guardar el cambio." });
      setOffered((current) => {
        const copy = { ...current };
        if (previous) copy[code] = previous;
        else delete copy[code];
        return copy;
      });
    }
    setSavingCode(null);
  };

  const groups = useMemo(() => {
    const needle = normalize(query.trim());
    return CUPS_GROUPS.map((group) => ({
      ...group,
      offeredCount: group.procedures.filter((procedure) => offered[procedure.code]).length,
      visible: group.procedures.filter((procedure) => {
        if (onlyOffered && !offered[procedure.code]) return false;
        if (!needle) return true;
        return procedure.code.includes(needle) || normalize(procedure.name).includes(needle);
      }),
    })).filter((group) => group.visible.length > 0);
  }, [offered, onlyOffered, query]);

  const offeredTotal = Object.keys(offered).length;
  const filtering = query.trim() !== "" || onlyOffered;

  if (loadError) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
        <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Códigos de la {CUPS_SOURCE}. Antes de facturar, pide a quien factura en la clínica que los confirme contra el
          anexo oficial del Ministerio de Salud.
        </span>
      </p>

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Procedimientos</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              La clínica presta {offeredTotal} de {CUPS_PROCEDURE_COUNT}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={onlyOffered} onChange={(event) => setOnlyOffered(event.target.checked)} />
              Solo los que presta
            </label>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar por código o nombre"
                placeholder="Buscar código o procedimiento"
                className="w-72 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        {notice ? (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            {notice}
          </p>
        ) : null}

        {!loaded ? (
          <p className="text-sm text-slate-500">Cargando catálogo…</p>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Ningún procedimiento coincide con la búsqueda.
          </div>
        ) : (
          <section aria-label="Catálogo CUPS por categoría" className="divide-y divide-slate-200 dark:divide-surface-muted">
            {groups.map((group) => (
              <details key={group.id} className="group/cups py-1" open={filtering || undefined}>
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-3 hover:bg-slate-50 dark:hover:bg-surface-muted/50 [&::-webkit-details-marker]:hidden">
                  <CaretRight
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open/cups:rotate-90 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-slate-900 dark:text-white">{group.label}</span>
                  <span className="ml-auto text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {group.offeredCount} de {group.procedures.length}
                  </span>
                </summary>
                <ul className="space-y-2 pb-3 pl-8">
                  {group.visible.map((procedure) => (
                    <ProcedureRow
                      key={procedure.code}
                      procedure={procedure}
                      state={offered[procedure.code] ?? null}
                      services={services}
                      professionals={professionals}
                      saving={savingCode === procedure.code}
                      error={rowError?.code === procedure.code ? rowError.message : null}
                      onChange={(next) => void save(procedure.code, next)}
                    />
                  ))}
                </ul>
              </details>
            ))}
          </section>
        )}
      </Card>
    </div>
  );
}

type ProcedureRowProps = {
  procedure: CupsProcedure;
  state: ProcedureState | null;
  services: ServiceOption[];
  professionals: ProfessionalOption[];
  saving: boolean;
  error: string | null;
  onChange: (next: ProcedureState | null) => void;
};

function ProcedureRow({ procedure, state, services, professionals, saving, error, onChange }: ProcedureRowProps) {
  const checkboxId = `cups-${procedure.code}`;
  const isOffered = state !== null;

  const toggleProfessional = (professionalId: string, checked: boolean) => {
    if (!state) return;
    const professionalIds = checked
      ? [...state.professionalIds, professionalId]
      : state.professionalIds.filter((id) => id !== professionalId);
    onChange({ ...state, professionalIds });
  };

  return (
    <li
      className={`rounded-xl border px-3 py-2 ${
        isOffered
          ? "border-brand-sky/40 bg-brand-light/50 dark:border-accent-cyan/20 dark:bg-brand-teal/10"
          : "border-transparent"
      }`}
      aria-busy={saving || undefined}
    >
      <div className="flex items-start gap-3">
        <input
          id={checkboxId}
          type="checkbox"
          className="mt-1"
          checked={isOffered}
          disabled={saving}
          onChange={(event) => onChange(event.target.checked ? { serviceId: null, professionalIds: [] } : null)}
        />
        <label htmlFor={checkboxId} className="flex-1 cursor-pointer text-sm text-slate-700 dark:text-slate-200">
          <span className="mr-2 font-semibold tabular-nums text-slate-900 dark:text-white">{procedure.code}</span>
          {procedure.name}
        </label>
      </div>

      {isOffered ? (
        <div className="mt-3 grid gap-3 pl-7 sm:grid-cols-[minmax(0,16rem)_1fr]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Se agenda como
            <select
              className="input mt-1 h-9 w-full text-sm normal-case"
              value={state.serviceId ?? ""}
              disabled={saving}
              onChange={(event) => onChange({ ...state, serviceId: event.target.value || null })}
            >
              <option value="">Sin servicio</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                  {service.active ? "" : " (inactivo)"}
                </option>
              ))}
            </select>
            {state.serviceId ? null : (
              <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-amber-700 dark:text-amber-300">
                Sin servicio no se puede agendar.
              </span>
            )}
          </label>

          <fieldset className="min-w-0">
            <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Lo realizan
            </legend>
            {professionals.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">No hay profesionales activos.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {professionals.map((professional) => (
                  <label key={professional.id} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={state.professionalIds.includes(professional.id)}
                      disabled={saving}
                      onChange={(event) => toggleProfessional(professional.id, event.target.checked)}
                    />
                    {professional.name}
                    {professional.specialty ? (
                      <span className="text-xs text-slate-400">· {professional.specialty}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 pl-7 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </li>
  );
}

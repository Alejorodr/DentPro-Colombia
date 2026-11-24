"use client";

import { useEffect, useId, useRef, useState } from "react";

import { MagnifyingGlass, X } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { fetchWithRetry } from "@/lib/http";

export interface PatientOption {
  id: string;
  name: string;
  lastName: string;
  patientCode?: string | null;
}

type Status = "idle" | "loading" | "ready" | "error";

const RESULT_LIMIT = 10;

/**
 * DOG-29: buscador de pacientes del profesional. Reemplaza un <select> que cargaba
 * solo los primeros 50 pacientes: quien pasara de ahí no aparecía y no había aviso.
 * Busca en el servidor (nombre, apellido, correo o código) con debounce y cancela la
 * búsqueda anterior, así una respuesta vieja nunca pisa a la nueva.
 */
export function PatientSearchSelect({
  value,
  onChange,
  placeholder = "Buscar paciente por nombre, correo o código (opcional)",
}: {
  value: PatientOption | null;
  onChange: (patient: PatientOption | null) => void;
  placeholder?: string;
}) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PatientOption[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setStatus("loading");

    const params = new URLSearchParams({ pageSize: String(RESULT_LIMIT) });
    if (debouncedQuery) params.set("q", debouncedQuery);

    fetchWithRetry(`/api/professional/patients?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { data?: PatientOption[] };
        if (controller.signal.aborted) return;
        setResults(body.data ?? []);
        setActiveIndex(-1);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });

    return () => controller.abort();
  }, [debouncedQuery, open]);

  const select = (patient: PatientOption) => {
    onChange(patient);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    inputRef.current?.focus();
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-surface-muted/60 dark:bg-surface-base dark:text-slate-100">
        <span>
          Paciente: <span className="font-semibold">{value.name} {value.lastName}</span>
          {value.patientCode ? <span className="text-slate-400"> · {value.patientCode}</span> : null}
        </span>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-brand-indigo hover:bg-brand-light dark:hover:bg-surface-muted"
        >
          <X size={16} aria-hidden="true" />
          Quitar
        </button>
      </div>
    );
  }

  const showList = open && (status !== "idle" || results.length > 0);

  return (
    <div className="relative">
      <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-label="Buscar paciente"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
            event.preventDefault();
            select(results[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-600 dark:border-surface-muted/60 dark:bg-surface-base dark:text-slate-100"
      />
      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Pacientes"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 text-xs shadow-lg shadow-slate-900/10 dark:border-surface-muted/60 dark:bg-surface-base"
        >
          {status === "loading" && results.length === 0 ? (
            <li className="px-3 py-2 text-slate-400" role="status">Buscando pacientes…</li>
          ) : null}
          {status === "error" ? (
            <li className="px-3 py-2 text-rose-500" role="alert">No pudimos buscar pacientes. Intenta de nuevo.</li>
          ) : null}
          {status === "ready" && results.length === 0 ? (
            <li className="px-3 py-2 text-slate-500">Ningún paciente coincide con la búsqueda.</li>
          ) : null}
          {results.map((patient, index) => (
            <li
              key={patient.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // mousedown en vez de click: el blur del input cerraría la lista antes del click.
              onMouseDown={(event) => {
                event.preventDefault();
                select(patient);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-3 py-2 text-slate-700 dark:text-slate-100 ${
                index === activeIndex ? "bg-brand-light dark:bg-surface-muted" : ""
              }`}
            >
              <span className="font-semibold">{patient.name} {patient.lastName}</span>
              {patient.patientCode ? <span className="text-slate-400"> · {patient.patientCode}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

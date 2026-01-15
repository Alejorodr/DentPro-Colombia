"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MagnifyingGlass } from "@phosphor-icons/react";

type SearchResult = {
  type: string;
  id: string;
  label: string;
  description?: string | null;
  href: string;
};

export function AdminGlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>();
    for (const result of results) {
      if (!groups.has(result.type)) {
        groups.set(result.type, []);
      }
      groups.get(result.type)!.push(result);
    }
    return Array.from(groups.entries());
  }, [results]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const handler = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&scope=admin`);
        if (response.ok) {
          const data = (await response.json()) as { results: SearchResult[] };
          setResults(data.results);
          setOpen(true);
        }
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (!query.trim()) return;
    router.push(`/portal/admin/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm shadow-slate-100/50 outline-none transition focus-within:ring-2 focus-within:ring-brand-teal/60 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200">
        <MagnifyingGlass aria-hidden="true" className="h-4 w-4" />
        <input
          type="search"
          placeholder="Search patients, staff, or services"
          aria-label="Buscar en el portal"
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
      </div>
      {open ? (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg shadow-slate-200/40 dark:border-surface-muted dark:bg-surface-elevated">
          {loading ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {query.trim().length < 2 ? "Escribe al menos 2 caracteres." : "Sin resultados."}
            </p>
          ) : (
            <div className="space-y-4">
              {groupedResults.map(([group, items]) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {group}
                  </p>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Link
                        key={`${item.type}-${item.id}`}
                        href={item.href}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 transition hover:bg-slate-50 dark:border-surface-muted/60 dark:hover:bg-surface-muted/50"
                        onClick={() => setOpen(false)}
                      >
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">{item.label}</p>
                          {item.description ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                          ) : null}
                        </div>
                        <span className="text-xs font-medium text-brand-teal dark:text-accent-cyan">Ver</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="mt-4 w-full rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-600 transition hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted dark:text-slate-300"
            onClick={handleSubmit}
          >
            Ver todos los resultados
          </button>
        </div>
      ) : null}
    </div>
  );
}

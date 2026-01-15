"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SearchResult = {
  type: string;
  id: string;
  label: string;
  description?: string | null;
  href: string;
};

export function AdminSearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (!query) {
      setResults([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&scope=admin&limit=10`);
        if (response.ok) {
          const data = (await response.json()) as { results: SearchResult[] };
          setResults(data.results);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Resultados
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {query ? `Búsqueda: “${query}”` : "Busca pacientes, staff o servicios"}
        </h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando resultados...</p>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:bg-surface-elevated/80 dark:text-slate-300">
          {query ? "Sin resultados para tu búsqueda." : "Ingresa un término en la búsqueda global."}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedResults.map(([group, items]) => (
            <div key={group} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {group}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm transition hover:border-brand-teal/40 hover:shadow-md dark:border-surface-muted dark:bg-surface-elevated"
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                    {item.description ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

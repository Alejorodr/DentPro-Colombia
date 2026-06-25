"use client";

import { useState } from "react";

export function AdminBootstrapButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"idle" | "ok" | "error">("idle");

  const handleBootstrap = async () => {
    if (!confirm("¿Poblar el homepage con el contenido por defecto? Esto solo agrega datos faltantes — no sobreescribe lo que ya existe.")) return;

    setLoading(true);
    setResult("idle");

    try {
      const response = await fetch("/api/admin/homepage/bootstrap", { method: "POST" });
      setResult(response.ok ? "ok" : "error");
    } catch {
      setResult("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={handleBootstrap}
        disabled={loading}
        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase text-slate-600 transition hover:border-brand-teal hover:text-brand-teal disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-muted dark:text-slate-300"
      >
        {loading ? "Poblando..." : "Poblar desde defaults"}
      </button>
      {result === "ok" && <p className="text-xs text-emerald-600">Contenido por defecto aplicado.</p>}
      {result === "error" && <p className="text-xs text-red-600">Error al poblar. Intenta de nuevo.</p>}
    </div>
  );
}

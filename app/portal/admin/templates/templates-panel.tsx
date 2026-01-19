"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
const templateTypes = [
  { value: "CONSENT", label: "Consentimiento" },
  { value: "QUOTE", label: "Presupuesto" },
  { value: "PRESCRIPTION", label: "Receta" },
];

type Template = {
  id: string;
  type: string;
  title: string;
  contentHtml: string;
  active: boolean;
  updatedAt: string;
};

export function AdminTemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    type: "CONSENT",
    title: "",
    contentHtml: "",
    active: true,
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [templates, selectedId],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithRetry("/api/admin/templates");
        if (!response.ok) {
          throw new Error("No se pudieron cargar las plantillas.");
        }
        const data = (await response.json()) as { templates?: Template[] };
        setTemplates(data.templates ?? []);
        if (data.templates && data.templates.length > 0) {
          setSelectedId(data.templates[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!selectedTemplate) {
      setFormState({ type: "CONSENT", title: "", contentHtml: "", active: true });
      return;
    }
    setFormState({
      type: selectedTemplate.type,
      title: selectedTemplate.title,
      contentHtml: selectedTemplate.contentHtml,
      active: selectedTemplate.active,
    });
  }, [selectedTemplate]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      type: formState.type,
      title: formState.title.trim(),
      contentHtml: formState.contentHtml.trim(),
      active: formState.active,
    };

    try {
      const response = await fetchWithTimeout(
        selectedId ? `/api/admin/templates/${selectedId}` : "/api/admin/templates",
        {
          method: selectedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("No se pudo guardar la plantilla.");
      }
      const data = (await response.json()) as { template?: Template };
      const nextTemplate = data.template;
      if (nextTemplate) {
        setTemplates((prev) => {
          const updated = prev.filter((template) => template.id !== nextTemplate.id);
          return [nextTemplate, ...updated];
        });
        setSelectedId(nextTemplate.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando plantillas...</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plantillas clínicas</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Documentos imprimibles</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-xs dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Plantillas</p>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="mt-3 w-full rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-brand-indigo hover:text-brand-indigo dark:border-slate-800 dark:text-slate-300"
          >
            + Nueva plantilla
          </button>
          <div className="mt-3 space-y-2">
            {templates.length === 0 ? (
              <p className="text-xs text-slate-500">Aún no hay plantillas.</p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${
                    selectedId === template.id
                      ? "border-brand-indigo bg-brand-indigo/10 text-brand-indigo"
                      : "border-slate-200 text-slate-600 hover:border-brand-indigo dark:border-slate-800 dark:text-slate-300"
                  }`}
                >
                  <p>{template.title}</p>
                  <p className="text-[11px] font-normal text-slate-400">{template.type}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-950">
          <form onSubmit={handleSave} className="space-y-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo</span>
                <select
                  value={formState.type}
                  onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  {templateTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Título</span>
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  placeholder="Título del documento"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contenido HTML</span>
              <textarea
                rows={8}
                value={formState.contentHtml}
                onChange={(event) => setFormState((prev) => ({ ...prev, contentHtml: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                placeholder="Escribe el contenido del documento..."
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formState.active}
                onChange={(event) => setFormState((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              Plantilla activa.
            </label>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar plantilla"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

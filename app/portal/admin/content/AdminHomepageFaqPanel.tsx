"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type FaqApiResponse = {
  faqs?: FaqItem[];
  faq?: FaqItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_FAQ = { question: "", answer: "", isActive: true };

export function AdminHomepageFaqPanel() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [newFaq, setNewFaq] = useState(EMPTY_FAQ);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/faqs");
    const body = (await response.json().catch(() => null)) as FaqApiResponse | null;

    if (!response.ok || !body?.faqs) {
      setError(body?.error ?? "No se pudieron cargar las preguntas frecuentes.");
      setLoading(false);
      return;
    }

    setFaqs(body.faqs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  const validationMessage = useMemo(() => error, [error]);

  const createFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      setError("La pregunta y la respuesta son obligatorias.");
      return;
    }
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFaq),
    });

    const body = (await response.json().catch(() => null)) as FaqApiResponse | null;

    if (!response.ok || !body?.faq) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear la pregunta frecuente.");
      setSaving(false);
      return;
    }

    setFaqs((prev) => [...prev, body.faq!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewFaq(EMPTY_FAQ);
    setSaving(false);
    setSuccess("Pregunta creada.");
  };

  const saveFaq = async (faq: FaqItem) => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: faq.question, answer: faq.answer, isActive: faq.isActive }),
    });

    const body = (await response.json().catch(() => null)) as FaqApiResponse | null;

    if (!response.ok || !body?.faq) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar la pregunta frecuente.");
      setSaving(false);
      return;
    }

    setFaqs((prev) => prev.map((item) => (item.id === faq.id ? body.faq! : item)));
    setSaving(false);
    setSuccess("Pregunta actualizada.");
  };

  const removeFaq = async (faq: FaqItem) => {
    if (!window.confirm(`¿Eliminar "${faq.question}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/faqs/${faq.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as FaqApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar la pregunta frecuente.");
      setSaving(false);
      return;
    }

    await loadFaqs();
    setSaving(false);
    setSuccess("Pregunta eliminada.");
  };

  const reorderFaqs = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const ordered = [...faqs];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/faqs/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar las preguntas.");
      setSaving(false);
      return;
    }

    setFaqs(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  const updateFaqField = (id: string, field: keyof FaqItem, value: string | boolean) => {
    setFaqs((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
          Homepage CMS
        </p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Preguntas frecuentes</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Se muestran en la sección FAQ del homepage. Máx. 500 chars por pregunta, 2.000 por respuesta.
        </p>
      </section>

      {/* New FAQ form */}
      <Card className="space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nueva pregunta</h3>
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pregunta
            </span>
            <input
              className="input h-11 text-sm"
              placeholder="¿Cómo agendo una cita?"
              value={newFaq.question}
              onChange={(e) => setNewFaq((prev) => ({ ...prev, question: e.target.value }))}
              disabled={saving}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Respuesta
            </span>
            <textarea
              className="input min-h-24 text-sm"
              placeholder="Podés reservar tu turno..."
              value={newFaq.answer}
              onChange={(e) => setNewFaq((prev) => ({ ...prev, answer: e.target.value }))}
              disabled={saving}
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={newFaq.isActive}
                onChange={(e) => setNewFaq((prev) => ({ ...prev, isActive: e.target.checked }))}
                disabled={saving}
              />
              Activa
            </label>
            <button
              type="button"
              className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60"
              onClick={createFaq}
              disabled={saving}
            >
              Crear pregunta
            </button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">Cargando preguntas frecuentes...</p>
        </Card>
      ) : null}

      {/* FAQ list */}
      {faqs.map((faq, index) => (
        <Card key={faq.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1 min-w-0 flex-1">
              {faq.question || <span className="italic text-slate-400">Sin pregunta</span>}
            </p>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-surface-muted dark:text-slate-300"
                onClick={() => reorderFaqs(index, index - 1)}
                disabled={saving || index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-surface-muted dark:text-slate-300"
                onClick={() => reorderFaqs(index, index + 1)}
                disabled={saving || index === faqs.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-surface-muted dark:text-slate-300"
                onClick={() => setEditingId((prev) => (prev === faq.id ? null : faq.id))}
                disabled={saving}
              >
                {editingId === faq.id ? "Cerrar" : "Editar"}
              </button>
              <button
                type="button"
                className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                onClick={() => removeFaq(faq)}
                disabled={saving}
              >
                Eliminar
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            #{faq.sortOrder + 1} · {faq.isActive ? "Activa" : "Inactiva"}
          </p>

          {editingId === faq.id ? (
            <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-surface-muted">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Pregunta
                </span>
                <input
                  className="input h-11 text-sm"
                  value={faq.question}
                  onChange={(e) => updateFaqField(faq.id, "question", e.target.value)}
                  disabled={saving}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Respuesta
                </span>
                <textarea
                  className="input min-h-28 text-sm"
                  value={faq.answer}
                  onChange={(e) => updateFaqField(faq.id, "answer", e.target.value)}
                  disabled={saving}
                />
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={faq.isActive}
                    onChange={(e) => updateFaqField(faq.id, "isActive", e.target.checked)}
                    disabled={saving}
                  />
                  Activa
                </label>
                <button
                  type="button"
                  className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60"
                  onClick={() => saveFaq(faq)}
                  disabled={saving}
                >
                  Guardar pregunta
                </button>
              </div>
            </div>
          ) : (
            <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{faq.answer}</p>
          )}
        </Card>
      ))}

      {!loading && faqs.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No hay preguntas frecuentes. Crea la primera arriba.
          </p>
        </Card>
      ) : null}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}

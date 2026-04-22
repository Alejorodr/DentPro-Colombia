"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type BookingOptionItem = {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type BookingOptionsApiResponse = {
  bookingOptions?: BookingOptionItem[];
  bookingOption?: BookingOptionItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_BOOKING_OPTION = {
  value: "",
  label: "",
  isActive: true,
};

export function AdminHomepageBookingOptionsPanel() {
  const [bookingOptions, setBookingOptions] = useState<BookingOptionItem[]>([]);
  const [newBookingOption, setNewBookingOption] = useState(EMPTY_BOOKING_OPTION);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBookingOptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/booking-options");
    const body = (await response.json().catch(() => null)) as BookingOptionsApiResponse | null;

    if (!response.ok || !body?.bookingOptions) {
      setError(body?.error ?? "No se pudieron cargar las opciones de agenda.");
      setLoading(false);
      return;
    }

    setBookingOptions(body.bookingOptions);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBookingOptions();
  }, [loadBookingOptions]);

  const validationMessage = useMemo(() => error, [error]);

  const createBookingOption = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/booking-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBookingOption),
    });

    const body = (await response.json().catch(() => null)) as BookingOptionsApiResponse | null;

    if (!response.ok || !body?.bookingOption) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear la opción de agenda.");
      setSaving(false);
      return;
    }

    setBookingOptions((prev) => [...prev, body.bookingOption!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewBookingOption(EMPTY_BOOKING_OPTION);
    setSaving(false);
    setSuccess("Opción de agenda creada.");
  };

  const saveBookingOption = async (bookingOption: BookingOptionItem) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/booking-options/${bookingOption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: bookingOption.value,
        label: bookingOption.label,
        isActive: bookingOption.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as BookingOptionsApiResponse | null;

    if (!response.ok || !body?.bookingOption) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar la opción de agenda.");
      setSaving(false);
      return;
    }

    setBookingOptions((prev) => prev.map((item) => (item.id === bookingOption.id ? body.bookingOption! : item)));
    setSaving(false);
    setSuccess("Opción de agenda actualizada.");
  };

  const removeBookingOption = async (bookingOption: BookingOptionItem) => {
    if (!window.confirm(`¿Eliminar la opción de agenda "${bookingOption.label}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/booking-options/${bookingOption.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as BookingOptionsApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar la opción de agenda.");
      setSaving(false);
      return;
    }

    await loadBookingOptions();
    setSaving(false);
    setSuccess("Opción de agenda eliminada.");
  };

  const reorderBookingOptions = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= bookingOptions.length) return;

    const ordered = [...bookingOptions];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/booking-options/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar las opciones de agenda.");
      setSaving(false);
      return;
    }

    setBookingOptions(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Opciones de agenda</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">CRUD, activación y orden manual de opciones del selector de agenda.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nueva opción de agenda</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input h-11 text-sm" placeholder="Value" value={newBookingOption.value} onChange={(e) => setNewBookingOption((prev) => ({ ...prev, value: e.target.value }))} disabled={saving} />
          <input className="input h-11 text-sm" placeholder="Label" value={newBookingOption.label} onChange={(e) => setNewBookingOption((prev) => ({ ...prev, label: e.target.value }))} disabled={saving} />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newBookingOption.isActive} onChange={(e) => setNewBookingOption((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createBookingOption} disabled={saving}>
          Crear opción
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando opciones...</p></Card> : null}

      {bookingOptions.map((bookingOption, index) => (
        <Card key={bookingOption.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{bookingOption.label}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderBookingOptions(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderBookingOptions(index, index + 1)} disabled={saving || index === bookingOptions.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === bookingOption.id ? null : bookingOption.id))} disabled={saving}>{editingId === bookingOption.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeBookingOption(bookingOption)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{bookingOption.sortOrder + 1} · {bookingOption.isActive ? "Activo" : "Inactivo"} · Value: {bookingOption.value}</p>

          {editingId === bookingOption.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input h-11 text-sm" value={bookingOption.value} onChange={(e) => setBookingOptions((prev) => prev.map((item) => (item.id === bookingOption.id ? { ...item, value: e.target.value } : item)))} disabled={saving} />
              <input className="input h-11 text-sm" value={bookingOption.label} onChange={(e) => setBookingOptions((prev) => prev.map((item) => (item.id === bookingOption.id ? { ...item, label: e.target.value } : item)))} disabled={saving} />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={bookingOption.isActive} onChange={(e) => setBookingOptions((prev) => prev.map((item) => (item.id === bookingOption.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveBookingOption(bookingOption)} disabled={saving}>
                Guardar opción
              </button>
            </div>
          ) : null}
        </Card>
      ))}

      {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
    </div>
  );
}

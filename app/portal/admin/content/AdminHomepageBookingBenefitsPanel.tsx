"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { MARKETING_ICON_KEYS } from "@/lib/marketing/homepage-types";

type BookingBenefitItem = {
  id: string;
  iconKey: (typeof MARKETING_ICON_KEYS)[number];
  text: string;
  sortOrder: number;
  isActive: boolean;
};

type BookingBenefitsApiResponse = {
  bookingBenefits?: BookingBenefitItem[];
  bookingBenefit?: BookingBenefitItem;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_BOOKING_BENEFIT = {
  iconKey: "CalendarCheck" as (typeof MARKETING_ICON_KEYS)[number],
  text: "",
  isActive: true,
};

export function AdminHomepageBookingBenefitsPanel() {
  const [bookingBenefits, setBookingBenefits] = useState<BookingBenefitItem[]>([]);
  const [newBookingBenefit, setNewBookingBenefit] = useState(EMPTY_BOOKING_BENEFIT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBookingBenefits = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/booking-benefits");
    const body = (await response.json().catch(() => null)) as BookingBenefitsApiResponse | null;

    if (!response.ok || !body?.bookingBenefits) {
      setError(body?.error ?? "No se pudieron cargar los beneficios de agenda.");
      setLoading(false);
      return;
    }

    setBookingBenefits(body.bookingBenefits);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBookingBenefits();
  }, [loadBookingBenefits]);

  const validationMessage = useMemo(() => error, [error]);

  const createBookingBenefit = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/homepage/booking-benefits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBookingBenefit),
    });

    const body = (await response.json().catch(() => null)) as BookingBenefitsApiResponse | null;

    if (!response.ok || !body?.bookingBenefit) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo crear el beneficio de agenda.");
      setSaving(false);
      return;
    }

    setBookingBenefits((prev) => [...prev, body.bookingBenefit!].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewBookingBenefit(EMPTY_BOOKING_BENEFIT);
    setSaving(false);
    setSuccess("Beneficio de agenda creado.");
  };

  const saveBookingBenefit = async (bookingBenefit: BookingBenefitItem) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/booking-benefits/${bookingBenefit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        iconKey: bookingBenefit.iconKey,
        text: bookingBenefit.text,
        isActive: bookingBenefit.isActive,
      }),
    });

    const body = (await response.json().catch(() => null)) as BookingBenefitsApiResponse | null;

    if (!response.ok || !body?.bookingBenefit) {
      setError(body?.details?.[0]?.message ?? body?.error ?? "No se pudo guardar el beneficio de agenda.");
      setSaving(false);
      return;
    }

    setBookingBenefits((prev) => prev.map((item) => (item.id === bookingBenefit.id ? body.bookingBenefit! : item)));
    setSaving(false);
    setSuccess("Beneficio de agenda actualizado.");
  };

  const removeBookingBenefit = async (bookingBenefit: BookingBenefitItem) => {
    if (!window.confirm(`¿Eliminar el beneficio "${bookingBenefit.text}"?`)) return;

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/admin/homepage/booking-benefits/${bookingBenefit.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as BookingBenefitsApiResponse | null;
      setError(body?.error ?? "No se pudo eliminar el beneficio de agenda.");
      setSaving(false);
      return;
    }

    await loadBookingBenefits();
    setSaving(false);
    setSuccess("Beneficio de agenda eliminado.");
  };

  const reorderBookingBenefits = async (sourceIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= bookingBenefits.length) return;

    const ordered = [...bookingBenefits];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/booking-benefits/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((item) => item.id) }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo reordenar los beneficios de agenda.");
      setSaving(false);
      return;
    }

    setBookingBenefits(ordered.map((item, index) => ({ ...item, sortOrder: index })));
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Beneficios de agenda</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">CRUD, activación y orden manual de beneficios del bloque de agenda.</p>
      </section>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo beneficio de agenda</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <select className="input h-11 text-sm" value={newBookingBenefit.iconKey} onChange={(e) => setNewBookingBenefit((prev) => ({ ...prev, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] }))} disabled={saving}>
            {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={newBookingBenefit.isActive} onChange={(e) => setNewBookingBenefit((prev) => ({ ...prev, isActive: e.target.checked }))} disabled={saving} /> Activo
          </label>
          <textarea className="input min-h-24 text-sm md:col-span-2" placeholder="Texto" value={newBookingBenefit.text} onChange={(e) => setNewBookingBenefit((prev) => ({ ...prev, text: e.target.value }))} disabled={saving} />
        </div>
        <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60" onClick={createBookingBenefit} disabled={saving}>
          Crear beneficio
        </button>
      </Card>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando beneficios...</p></Card> : null}

      {bookingBenefits.map((bookingBenefit, index) => (
        <Card key={bookingBenefit.id} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{bookingBenefit.text}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderBookingBenefits(index, index - 1)} disabled={saving || index === 0}>Subir</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => reorderBookingBenefits(index, index + 1)} disabled={saving || index === bookingBenefits.length - 1}>Bajar</button>
              <button type="button" className="rounded-full border px-3 py-1 text-xs" onClick={() => setEditingId((prev) => (prev === bookingBenefit.id ? null : bookingBenefit.id))} disabled={saving}>{editingId === bookingBenefit.id ? "Cerrar" : "Editar"}</button>
              <button type="button" className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700" onClick={() => removeBookingBenefit(bookingBenefit)} disabled={saving}>Eliminar</button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">Orden #{bookingBenefit.sortOrder + 1} · {bookingBenefit.isActive ? "Activo" : "Inactivo"} · Icono: {bookingBenefit.iconKey}</p>

          {editingId === bookingBenefit.id ? (
            <div className="grid gap-3 md:grid-cols-2">
              <select className="input h-11 text-sm" value={bookingBenefit.iconKey} onChange={(e) => setBookingBenefits((prev) => prev.map((item) => (item.id === bookingBenefit.id ? { ...item, iconKey: e.target.value as (typeof MARKETING_ICON_KEYS)[number] } : item)))} disabled={saving}>
                {MARKETING_ICON_KEYS.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input type="checkbox" checked={bookingBenefit.isActive} onChange={(e) => setBookingBenefits((prev) => prev.map((item) => (item.id === bookingBenefit.id ? { ...item, isActive: e.target.checked } : item)))} disabled={saving} /> Activo
              </label>
              <textarea className="input min-h-24 text-sm md:col-span-2" value={bookingBenefit.text} onChange={(e) => setBookingBenefits((prev) => prev.map((item) => (item.id === bookingBenefit.id ? { ...item, text: e.target.value } : item)))} disabled={saving} />
              <button type="button" className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-60 md:justify-self-start" onClick={() => saveBookingBenefit(bookingBenefit)} disabled={saving}>
                Guardar beneficio
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

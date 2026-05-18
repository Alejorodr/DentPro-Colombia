"use client";

import { useCallback, useEffect, useState } from "react";

import { MagnifyingGlass, PencilSimple, Trash, X } from "@/components/ui/Icon";
import { Card } from "@/app/portal/components/ui/Card";
import { Table } from "@/app/portal/components/ui/Table";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type ServiceRecord = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  durationMinutes?: number | null;
  active: boolean;
  specialtyId?: string | null;
};

type SpecialtyOption = { id: string; name: string };

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  duration: string;
  active: boolean;
  specialtyId: string;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  duration: "",
  active: true,
  specialtyId: "",
};

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cents / 100);

export function AdminServicesPanel() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ServiceForm>(emptyForm);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [editForm, setEditForm] = useState<ServiceForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ServiceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadServices = useCallback(async (search: string) => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (search.trim()) params.set("q", search.trim());
    const response = await fetchWithRetry(`/api/services?${params.toString()}`);
    if (response.ok) {
      const data = (await response.json()) as { data: ServiceRecord[] };
      setServices(data.data ?? []);
    }
  }, []);

  // Initial load + specialties
  useEffect(() => {
    void loadServices("");
    fetchWithRetry("/api/specialties?pageSize=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data: SpecialtyOption[] } | null) => {
        if (data?.data) setSpecialties(data.data);
      })
      .catch(() => {});
  }, [loadServices]);

  // Debounced search
  useEffect(() => {
    const timer = window.setTimeout(() => void loadServices(query), 250);
    return () => window.clearTimeout(timer);
  }, [loadServices, query]);

  const openEdit = (service: ServiceRecord) => {
    setEditing(service);
    setEditForm({
      name: service.name,
      description: service.description ?? "",
      price: String(service.priceCents / 100),
      duration: service.durationMinutes != null ? String(service.durationMinutes) : "",
      active: service.active,
      specialtyId: service.specialtyId ?? "",
    });
    setError(null);
  };

  const createService = async () => {
    if (!createForm.name || !createForm.price) {
      setError("Nombre y precio son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        priceCents: Math.round(Number(createForm.price) * 100),
        durationMinutes: createForm.duration ? Number(createForm.duration) : null,
        active: createForm.active,
        specialtyId: createForm.specialtyId || null,
      }),
    });
    if (response.ok) {
      setIsCreateOpen(false);
      setCreateForm(emptyForm);
      setFeedback("Servicio creado correctamente.");
      void loadServices(query);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo crear el servicio.");
    }
    setSaving(false);
  };

  const updateService = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/services/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        priceCents: Math.round(Number(editForm.price) * 100),
        durationMinutes: editForm.duration ? Number(editForm.duration) : null,
        active: editForm.active,
        specialtyId: editForm.specialtyId || null,
      }),
    });
    if (response.ok) {
      setEditing(null);
      setFeedback("Servicio actualizado correctamente.");
      void loadServices(query);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo actualizar el servicio.");
    }
    setSaving(false);
  };

  const toggleActive = async (service: ServiceRecord) => {
    setSaving(true);
    await fetchWithTimeout(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    void loadServices(query);
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    await fetchWithTimeout(`/api/services/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setFeedback("Servicio eliminado.");
    void loadServices(query);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
            Servicios y tarifas
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Catálogo de servicios</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar servicio"
              className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => { setIsCreateOpen(true); setError(null); }}
            className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
          >
            + Nuevo servicio
          </button>
        </div>
      </section>

      {feedback ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          {feedback}
        </p>
      ) : null}

      <Card className="space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Listado</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Todos los servicios</h2>
          </div>
          <span className="text-xs text-slate-400">{services.length} servicios</span>
        </div>

        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No hay servicios registrados aún.
          </div>
        ) : (
          <Table>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Servicio</th>
                <th className="px-4 py-3 text-left font-semibold">Especialidad</th>
                <th className="px-4 py-3 text-left font-semibold">Precio</th>
                <th className="px-4 py-3 text-left font-semibold">Duración</th>
                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                <th className="px-4 py-3 text-left font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
              {services.map((service) => {
                const specialty = specialties.find((s) => s.id === service.specialtyId);
                return (
                  <tr key={service.id} className="bg-white dark:bg-surface-elevated/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{service.name}</p>
                      {service.description ? (
                        <p className="text-xs text-slate-400">{service.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {specialty?.name ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(service.priceCents)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {service.durationMinutes != null ? `${service.durationMinutes} min` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void toggleActive(service)}
                        disabled={saving}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          service.active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-muted dark:text-slate-400"
                        }`}
                      >
                        {service.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(service)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                        >
                          <PencilSimple size={14} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(service)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-50"
                        >
                          <Trash size={14} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create modal */}
      {isCreateOpen ? (
        <ServiceModal
          title="Nuevo servicio"
          form={createForm}
          specialties={specialties}
          saving={saving}
          error={error}
          onChange={setCreateForm}
          onSubmit={createService}
          onClose={() => { setIsCreateOpen(false); setError(null); }}
          submitLabel="Crear servicio"
        />
      ) : null}

      {/* Edit modal */}
      {editing ? (
        <ServiceModal
          title={`Editar · ${editing.name}`}
          form={editForm}
          specialties={specialties}
          saving={saving}
          error={error}
          onChange={setEditForm}
          onSubmit={updateService}
          onClose={() => { setEditing(null); setError(null); }}
          submitLabel="Guardar cambios"
        />
      ) : null}

      {/* Delete confirm modal */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Confirmar eliminación</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{deleteTarget.name}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Esta acción no se puede deshacer. Si el servicio tiene citas asociadas, no podrá eliminarse.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={saving}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
              >
                {saving ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ServiceModal({
  title,
  form,
  specialties,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
  submitLabel,
}: {
  title: string;
  form: ServiceForm;
  specialties: SpecialtyOption[];
  saving: boolean;
  error: string | null;
  onChange: (form: ServiceForm) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel: string;
}) {
  const set = (key: keyof ServiceForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: event.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Servicios y tarifas</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-surface-muted"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 md:col-span-2">
            Nombre *
            <input
              className="input mt-2 h-10 w-full text-sm normal-case"
              placeholder="Ej. Limpieza dental"
              value={form.name}
              onChange={set("name")}
              disabled={saving}
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 md:col-span-2">
            Descripción
            <input
              className="input mt-2 h-10 w-full text-sm normal-case"
              placeholder="Descripción breve (opcional)"
              value={form.description}
              onChange={set("description")}
              disabled={saving}
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Precio (COP) *
            <input
              className="input mt-2 h-10 w-full text-sm normal-case"
              type="number"
              min={0}
              step={1000}
              placeholder="Ej. 80000"
              value={form.price}
              onChange={set("price")}
              disabled={saving}
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Duración (min)
            <input
              className="input mt-2 h-10 w-full text-sm normal-case"
              type="number"
              min={0}
              step={15}
              placeholder="Ej. 30"
              value={form.duration}
              onChange={set("duration")}
              disabled={saving}
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Especialidad
            <select
              className="input mt-2 h-10 w-full text-sm normal-case"
              value={form.specialtyId}
              onChange={set("specialtyId")}
              disabled={saving}
            >
              <option value="">Sin especialidad</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => onChange({ ...form, active: event.target.checked })}
              disabled={saving}
              className="h-4 w-4 rounded border-slate-300 text-brand-teal"
            />
            Activo
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

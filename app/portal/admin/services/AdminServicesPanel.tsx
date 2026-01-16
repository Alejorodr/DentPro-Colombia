"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MagnifyingGlass, PencilSimple, Trash } from "@/components/ui/Icon";

import { Card } from "@/app/portal/components/ui/Card";
import { Table } from "@/app/portal/components/ui/Table";

type ServiceRecord = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  durationMinutes?: number | null;
  active: boolean;
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration: "",
  active: true,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);

export function AdminServicesPanel() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    params.set("pageSize", "50");
    const response = await fetch(`/api/services?${params.toString()}`);
    if (response.ok) {
      const data = (await response.json()) as { data: ServiceRecord[] };
      setServices(data.data ?? []);
    }
  }, [query]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    const handler = window.setTimeout(() => void loadServices(), 250);
    return () => window.clearTimeout(handler);
  }, [loadServices, query]);

  const filteredServices = useMemo(() => services, [services]);

  const createService = async () => {
    if (!form.name || !form.price) {
      setError("Nombre y precio son obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        priceCents: Math.round(Number(form.price) * 100),
        durationMinutes: form.duration ? Number(form.duration) : null,
        active: form.active,
      }),
    });

    if (response.ok) {
      setForm(emptyForm);
      await loadServices();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo crear el servicio.");
    }

    setSaving(false);
  };

  const updateService = async () => {
    if (!editing) {
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/services/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name,
        description: editing.description ?? null,
        priceCents: editing.priceCents,
        durationMinutes: editing.durationMinutes ?? null,
        active: editing.active,
      }),
    });

    if (response.ok) {
      setEditing(null);
      await loadServices();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo actualizar el servicio.");
    }

    setSaving(false);
  };

  const removeService = async (service: ServiceRecord) => {
    if (!window.confirm(`¿Eliminar el servicio ${service.name}?`)) {
      return;
    }
    setSaving(true);
    await fetch(`/api/services/${service.id}`, { method: "DELETE" });
    await loadServices();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
            Services & Pricing
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Servicios y precios</h1>
        </div>
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar servicio"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nuevo servicio</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Crear tarifa</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="input h-11 text-sm"
            placeholder="Nombre"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Descripción"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Precio (COP)"
            type="number"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Duración (min)"
            type="number"
            value={form.duration}
            onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
            disabled={saving}
          />
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              disabled={saving}
            />
            Activo
          </label>
        </div>
        <button
          type="button"
          className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
          onClick={createService}
          disabled={saving}
        >
          Crear servicio
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Listado</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Servicios activos</h2>
        </div>
        <Table>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Servicio</th>
              <th className="px-4 py-3 font-semibold">Descripción</th>
              <th className="px-4 py-3 font-semibold">Precio</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
            {filteredServices.map((service) => (
              <tr key={service.id} className="bg-white dark:bg-surface-elevated/60">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{service.name}</td>
                <td className="px-4 py-3">{service.description ?? "-"}</td>
                <td className="px-4 py-3">{formatCurrency(service.priceCents / 100)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      service.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {service.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => setEditing(service)}
                    >
                      <PencilSimple size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                      onClick={() => removeService(service)}
                      disabled={saving}
                    >
                      <Trash size={14} />
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Editar servicio</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing.name}</h3>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                className="input h-11 text-sm"
                placeholder="Nombre"
                value={editing.name}
                onChange={(event) => setEditing((prev) => (prev ? { ...prev, name: event.target.value } : null))}
              />
              <input
                className="input h-11 text-sm"
                placeholder="Descripción"
                value={editing.description ?? ""}
                onChange={(event) =>
                  setEditing((prev) => (prev ? { ...prev, description: event.target.value } : null))
                }
              />
              <input
                className="input h-11 text-sm"
                placeholder="Precio (COP)"
                type="number"
                value={editing.priceCents / 100}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, priceCents: Math.round(Number(event.target.value) * 100) } : null,
                  )
                }
              />
              <input
                className="input h-11 text-sm"
                placeholder="Duración (min)"
                type="number"
                value={editing.durationMinutes ?? ""}
                onChange={(event) =>
                  setEditing((prev) =>
                    prev ? { ...prev, durationMinutes: Number(event.target.value) || null } : null,
                  )
                }
              />
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(event) =>
                    setEditing((prev) => (prev ? { ...prev, active: event.target.checked } : null))
                  }
                />
                Activo
              </label>
            </div>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
                onClick={updateService}
                disabled={saving}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

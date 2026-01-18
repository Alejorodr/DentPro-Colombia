"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MagnifyingGlass, PencilSimple, Trash, UserMinus } from "@/components/ui/Icon";

import { Card } from "@/app/portal/components/ui/Card";
import { Table } from "@/app/portal/components/ui/Table";

const emptyForm = {
  name: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  documentId: "",
};

type PatientRecord = {
  id: string;
  userId: string;
  phone?: string | null;
  documentId?: string | null;
  active: boolean;
  user: { name: string; lastName: string; email: string };
};

export function ReceptionistPatients() {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PatientRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    params.set("pageSize", "50");
    const response = await fetch(`/api/patients?${params.toString()}`);
    if (response.ok) {
      const data = (await response.json()) as { data: PatientRecord[] };
      setPatients(data.data ?? []);
    }
  }, [query]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    const handler = window.setTimeout(() => void loadPatients(), 250);
    return () => window.clearTimeout(handler);
  }, [loadPatients, query]);

  const filteredPatients = useMemo(() => patients, [patients]);

  const createPatient = async () => {
    if (!form.name || !form.lastName || !form.email || !form.password) {
      setError("Nombre, apellido, correo y contraseña son obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: "PACIENTE",
        phone: form.phone,
        documentId: form.documentId,
      }),
    });

    if (response.ok) {
      setForm(emptyForm);
      await loadPatients();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo crear el paciente.");
    }

    setSaving(false);
  };

  const updatePatient = async () => {
    if (!editing) {
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch(`/api/patients/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.user.name,
        lastName: editing.user.lastName,
        email: editing.user.email,
        phone: editing.phone,
        documentId: editing.documentId,
        active: editing.active,
      }),
    });

    if (response.ok) {
      setEditing(null);
      await loadPatients();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No se pudo actualizar.");
    }

    setSaving(false);
  };

  const toggleActive = async (patient: PatientRecord) => {
    setSaving(true);
    await fetch(`/api/patients/${patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !patient.active }),
    });
    await loadPatients();
    setSaving(false);
  };

  const removePatient = async (patient: PatientRecord) => {
    if (!window.confirm(`¿Eliminar a ${patient.user.name} ${patient.user.lastName}?`)) {
      return;
    }
    setSaving(true);
    await fetch(`/api/patients/${patient.id}`, { method: "DELETE" });
    await loadPatients();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Patients</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Gestión de pacientes</h1>
        </div>
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar paciente"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nuevo paciente</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Crear ficha</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { key: "name", label: "Nombre" },
            { key: "lastName", label: "Apellido" },
            { key: "email", label: "Correo" },
            { key: "password", label: "Contraseña", type: "password" },
            { key: "phone", label: "Teléfono" },
            { key: "documentId", label: "Documento" },
          ].map((field) => (
            <input
              key={field.key}
              className="input h-11 text-sm"
              placeholder={field.label}
              type={field.type ?? "text"}
              value={form[field.key as keyof typeof form]}
              onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
              disabled={saving}
            />
          ))}
        </div>
        <button
          type="button"
          className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white"
          onClick={createPatient}
          disabled={saving}
        >
          Crear paciente
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Listado</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pacientes activos</h2>
        </div>
        <Table>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">Correo</th>
              <th className="px-4 py-3 font-semibold">Documento</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className="bg-white dark:bg-surface-elevated/60">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                  {patient.user.name} {patient.user.lastName}
                </td>
                <td className="px-4 py-3">{patient.user.email}</td>
                <td className="px-4 py-3">{patient.documentId ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      patient.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {patient.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => setEditing(patient)}
                    >
                      <PencilSimple size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700"
                      onClick={() => toggleActive(patient)}
                      disabled={saving}
                    >
                      <UserMinus size={14} />
                      {patient.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600"
                      onClick={() => removePatient(patient)}
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Editar paciente</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editing.user.name} {editing.user.lastName}
              </h3>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {[
                { key: "name", label: "Nombre", value: editing.user.name },
                { key: "lastName", label: "Apellido", value: editing.user.lastName },
                { key: "email", label: "Correo", value: editing.user.email },
                { key: "phone", label: "Teléfono", value: editing.phone ?? "" },
                { key: "documentId", label: "Documento", value: editing.documentId ?? "" },
              ].map((field) => (
                <input
                  key={field.key}
                  className="input h-11 text-sm"
                  placeholder={field.label}
                  value={field.value}
                  onChange={(event) =>
                    setEditing((prev) =>
                      prev
                        ? {
                            ...prev,
                            ...(field.key === "name" || field.key === "lastName" || field.key === "email"
                              ? { user: { ...prev.user, [field.key]: event.target.value } }
                              : { [field.key]: event.target.value }),
                          }
                        : null,
                    )
                  }
                />
              ))}
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
                onClick={updatePatient}
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

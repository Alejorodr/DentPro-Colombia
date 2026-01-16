"use client";

import { useEffect, useState } from "react";

type Specialty = {
  id: string;
  name: string;
};

type Professional = {
  id: string;
  slotDurationMinutes: number | null;
  active: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    lastName: string;
  };
  specialty: Specialty;
};

export function AdminProfessionalsPanel() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    name: "",
    lastName: "",
    specialtyId: "",
    slotDurationMinutes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [professionalsResponse, specialtiesResponse] = await Promise.all([
      fetch("/api/professionals?pageSize=50"),
      fetch("/api/specialties"),
    ]);

    if (professionalsResponse.ok) {
      const data = (await professionalsResponse.json()) as { data: Professional[] };
      setProfessionals(data.data ?? []);
    }

    if (specialtiesResponse.ok) {
      const data = (await specialtiesResponse.json()) as Specialty[];
      setSpecialties(data);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createProfessional = async () => {
    if (!formState.email || !formState.password || !formState.name || !formState.lastName || !formState.specialtyId) {
      setError("Completa todos los campos.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formState.email,
        password: formState.password,
        name: formState.name,
        lastName: formState.lastName,
        specialtyId: formState.specialtyId,
        slotDurationMinutes: formState.slotDurationMinutes ? Number(formState.slotDurationMinutes) : undefined,
      }),
    });

    if (response.ok) {
      const created = (await response.json()) as Professional;
      setProfessionals((prev) => [...prev, created]);
      setFormState({
        email: "",
        password: "",
        name: "",
        lastName: "",
        specialtyId: "",
        slotDurationMinutes: "",
      });
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos crear el profesional.");
    }

    setSaving(false);
  };

  const updateProfessional = async (professional: Professional, updates: Partial<Professional>) => {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/professionals/${professional.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const updated = (await response.json()) as Professional;
      setProfessionals((prev) => prev.map((item) => (item.id === professional.id ? updated : item)));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos actualizar el profesional.");
    }

    setSaving(false);
  };

  const deleteProfessional = async (professional: Professional) => {
    if (!window.confirm(`¿Eliminar a ${professional.user.email}?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch(`/api/professionals/${professional.id}`, { method: "DELETE" });

    if (response.ok) {
      setProfessionals((prev) => prev.filter((item) => item.id !== professional.id));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos eliminar el profesional.");
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Nuevo profesional</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            className="input h-11 text-sm"
            placeholder="Nombre"
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Apellido"
            value={formState.lastName}
            onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            type="email"
            placeholder="Correo"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            type="password"
            placeholder="Contraseña"
            value={formState.password}
            onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
            disabled={saving}
          />
          <select
            className="input h-11 text-sm"
            value={formState.specialtyId}
            onChange={(event) => setFormState((prev) => ({ ...prev, specialtyId: event.target.value }))}
            disabled={saving}
          >
            <option value="">Especialidad</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
          <input
            className="input h-11 text-sm"
            placeholder="Duración slot (min)"
            value={formState.slotDurationMinutes}
            onChange={(event) => setFormState((prev) => ({ ...prev, slotDurationMinutes: event.target.value }))}
            disabled={saving}
          />
        </div>
        <button
          type="button"
          className="mt-4 rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          onClick={createProfessional}
          disabled={saving}
        >
          Crear profesional
        </button>
        {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profesionales</h2>
        <div className="mt-4 space-y-3">
          {professionals.map((professional) => (
            <div
              key={professional.id}
              className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-surface-muted/70 dark:bg-surface-base/60"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {professional.user.name} {professional.user.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{professional.user.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Especialidad: {professional.specialty.name} · Slot:{" "}
                    {professional.slotDurationMinutes ?? "Sin definir"} min
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-brand-teal px-3 py-1 text-xs font-semibold uppercase text-brand-teal"
                    onClick={() => updateProfessional(professional, { active: !professional.active })}
                    disabled={saving}
                  >
                    {professional.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
                    onClick={() => {
                      const slot = window.prompt(
                        "Duración slot (min)",
                        professional.slotDurationMinutes?.toString() ?? "",
                      );
                      if (!slot) {
                        return;
                      }
                      updateProfessional(professional, { slotDurationMinutes: Number(slot) });
                    }}
                    disabled={saving}
                  >
                    Editar slot
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold uppercase text-red-600"
                    onClick={() => deleteProfessional(professional)}
                    disabled={saving}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

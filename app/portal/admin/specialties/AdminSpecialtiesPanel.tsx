"use client";

import { useEffect, useState } from "react";

type Specialty = {
  id: string;
  name: string;
  defaultSlotDurationMinutes: number;
  active: boolean;
};

export function AdminSpecialtiesPanel() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSpecialties = async () => {
    const response = await fetch("/api/specialties");
    if (response.ok) {
      const data = (await response.json()) as Specialty[];
      setSpecialties(data);
    }
  };

  useEffect(() => {
    void loadSpecialties();
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !duration.trim()) {
      setError("Nombre y duración son obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch("/api/specialties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, defaultSlotDurationMinutes: Number(duration) }),
    });

    if (response.ok) {
      const created = (await response.json()) as Specialty;
      setSpecialties((prev) => [...prev, created]);
      setName("");
      setDuration("");
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos crear la especialidad.");
    }

    setSaving(false);
  };

  const updateSpecialty = async (specialty: Specialty, updates: Partial<Specialty>) => {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/specialties/${specialty.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const updated = (await response.json()) as Specialty;
      setSpecialties((prev) => prev.map((item) => (item.id === specialty.id ? updated : item)));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos actualizar la especialidad.");
    }

    setSaving(false);
  };

  const deleteSpecialty = async (specialty: Specialty) => {
    if (!window.confirm(`¿Eliminar ${specialty.name}?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch(`/api/specialties/${specialty.id}`, { method: "DELETE" });

    if (response.ok) {
      setSpecialties((prev) => prev.filter((item) => item.id !== specialty.id));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos eliminar la especialidad.");
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Nueva especialidad</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            className="input h-11 text-sm"
            placeholder="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Duración (min)"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            disabled={saving}
          />
          <button
            type="button"
            className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
            onClick={handleCreate}
            disabled={saving}
          >
            Crear especialidad
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Especialidades</h2>
        <div className="mt-4 space-y-3">
          {specialties.map((specialty) => (
            <div key={specialty.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{specialty.name}</p>
                  <p className="text-xs text-slate-500">
                    Duración base: {specialty.defaultSlotDurationMinutes} min · {specialty.active ? "Activa" : "Inactiva"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-brand-teal px-3 py-1 text-xs font-semibold uppercase text-brand-teal"
                    onClick={() =>
                      updateSpecialty(specialty, {
                        active: !specialty.active,
                      })
                    }
                    disabled={saving}
                  >
                    {specialty.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase"
                    onClick={() => {
                      const nextName = window.prompt("Nuevo nombre", specialty.name);
                      if (!nextName) {
                        return;
                      }
                      const nextDuration = window.prompt(
                        "Duración base (min)",
                        specialty.defaultSlotDurationMinutes.toString(),
                      );
                      if (!nextDuration) {
                        return;
                      }
                      updateSpecialty(specialty, {
                        name: nextName,
                        defaultSlotDurationMinutes: Number(nextDuration),
                      });
                    }}
                    disabled={saving}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold uppercase text-red-600"
                    onClick={() => deleteSpecialty(specialty)}
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

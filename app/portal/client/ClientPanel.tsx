"use client";

import { useEffect, useState } from "react";

import { AppointmentsList } from "@/app/portal/components/AppointmentsList";

type AppointmentItem = Parameters<typeof AppointmentsList>[0]["initialAppointments"][number];

type UserProfile = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  patient?: { phone?: string | null; documentId?: string | null } | null;
};

export function ClientPanel() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    documentId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [appointmentsResponse, profileResponse] = await Promise.all([
      fetch("/api/appointments"),
      fetch("/api/users/me"),
    ]);

    if (appointmentsResponse.ok) {
      const data = (await appointmentsResponse.json()) as AppointmentItem[];
      setAppointments(data);
    }

    if (profileResponse.ok) {
      const data = (await profileResponse.json()) as UserProfile;
      setProfile(data);
      setFormState({
        name: data.name ?? "",
        lastName: data.lastName ?? "",
        email: data.email ?? "",
        phone: data.patient?.phone ?? "",
        documentId: data.patient?.documentId ?? "",
      });
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState),
    });

    if (response.ok) {
      const data = (await response.json()) as UserProfile;
      setProfile(data);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos actualizar tu perfil.");
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Mi perfil</h2>
        <p className="text-sm text-slate-600">Actualiza tus datos básicos.</p>
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
            placeholder="Correo"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Teléfono"
            value={formState.phone}
            onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Documento"
            value={formState.documentId}
            onChange={(event) => setFormState((prev) => ({ ...prev, documentId: event.target.value }))}
            disabled={saving}
          />
        </div>
        <button
          type="button"
          className="mt-4 rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          onClick={saveProfile}
          disabled={saving}
        >
          Guardar cambios
        </button>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Mis citas</h2>
        {profile ? <AppointmentsList initialAppointments={appointments} role="PACIENTE" /> : null}
      </section>
    </div>
  );
}

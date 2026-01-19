"use client";

import { useEffect, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type PatientProfile = {
  phone?: string | null;
  documentId?: string | null;
  address?: string | null;
  city?: string | null;
  insuranceProvider?: string | null;
  insuranceStatus?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  patientCode?: string | null;
  dateOfBirth?: string | null;
};

type UserProfile = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  patient?: PatientProfile | null;
};

const insuranceOptions = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "UNKNOWN", label: "No definido" },
];

export function ClientProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    lastName: "",
    email: "",
    phone: "",
    documentId: "",
    address: "",
    city: "",
    insuranceProvider: "",
    insuranceStatus: "UNKNOWN",
    gender: "",
    avatarUrl: "",
    patientCode: "",
    dateOfBirth: "",
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchWithRetry("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserProfile | null) => {
        if (!isMounted || !data) {
          return;
        }
        setProfile(data);
        setFormState({
          name: data.name ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.patient?.phone ?? "",
          documentId: data.patient?.documentId ?? "",
          address: data.patient?.address ?? "",
          city: data.patient?.city ?? "",
          insuranceProvider: data.patient?.insuranceProvider ?? "",
          insuranceStatus: data.patient?.insuranceStatus ?? "UNKNOWN",
          gender: data.patient?.gender ?? "",
          avatarUrl: data.patient?.avatarUrl ?? "",
          patientCode: data.patient?.patientCode ?? "",
          dateOfBirth: data.patient?.dateOfBirth ?? "",
        });
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    const response = await fetchWithTimeout("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formState),
    });

    if (response.ok) {
      const data = (await response.json()) as UserProfile;
      setProfile(data);
      setStatus("Perfil actualizado correctamente.");
    } else {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(data?.error ?? "No pudimos actualizar tu perfil.");
    }

    setSaving(false);
  };

  if (!profile) {
    return <p className="text-sm text-slate-500">Cargando perfil...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/70 dark:bg-surface-elevated">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Nombre
          <input
            className="input h-11 text-sm"
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Apellido
          <input
            className="input h-11 text-sm"
            value={formState.lastName}
            onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Email
          <input
            type="email"
            className="input h-11 text-sm"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Teléfono
          <input
            className="input h-11 text-sm"
            value={formState.phone}
            onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Documento
          <input
            className="input h-11 text-sm"
            value={formState.documentId}
            onChange={(event) => setFormState((prev) => ({ ...prev, documentId: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Código paciente
          <input
            className="input h-11 text-sm"
            value={formState.patientCode}
            onChange={(event) => setFormState((prev) => ({ ...prev, patientCode: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Dirección
          <input
            className="input h-11 text-sm"
            value={formState.address}
            onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Ciudad
          <input
            className="input h-11 text-sm"
            value={formState.city}
            onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Fecha de nacimiento
          <input
            type="date"
            className="input h-11 text-sm"
            value={formState.dateOfBirth}
            onChange={(event) => setFormState((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Género
          <input
            className="input h-11 text-sm"
            value={formState.gender}
            onChange={(event) => setFormState((prev) => ({ ...prev, gender: event.target.value }))}
            disabled={saving}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Aseguradora
          <input
            className="input h-11 text-sm"
            value={formState.insuranceProvider}
            onChange={(event) => setFormState((prev) => ({ ...prev, insuranceProvider: event.target.value }))}
            disabled={saving}
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Estado del seguro
          <select
            className="input h-11 text-sm"
            value={formState.insuranceStatus}
            onChange={(event) => setFormState((prev) => ({ ...prev, insuranceStatus: event.target.value }))}
            disabled={saving}
          >
            {insuranceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Avatar URL
        <input
          className="input h-11 text-sm"
          value={formState.avatarUrl}
          onChange={(event) => setFormState((prev) => ({ ...prev, avatarUrl: event.target.value }))}
          disabled={saving}
        />
      </label>

      {status ? <p className="text-sm text-slate-600 dark:text-slate-300">{status}</p> : null}

      <button
        type="submit"
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        disabled={saving}
      >
        Guardar cambios
      </button>
    </form>
  );
}

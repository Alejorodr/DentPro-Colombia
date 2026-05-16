"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type UserProfile = {
  name: string;
  lastName: string;
  patient?: {
    phone?: string | null;
    documentId?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
  } | null;
};

export function OnboardingForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    phone: "",
    documentId: "",
    dateOfBirth: "",
    gender: "",
  });

  useEffect(() => {
    let isMounted = true;
    fetchWithRetry("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserProfile | null) => {
        if (!isMounted || !data) return;
        setForm((prev) => ({
          ...prev,
          name: data.name ?? "",
          lastName: data.lastName ?? "",
          phone: data.patient?.phone ?? "",
          documentId: data.patient?.documentId ?? "",
          dateOfBirth: data.patient?.dateOfBirth
            ? new Date(data.patient.dateOfBirth).toISOString().slice(0, 10)
            : "",
          gender: data.patient?.gender ?? "",
        }));
      })
      .catch(() => {
        if (isMounted) setError("No se pudo cargar tu información.");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.phone.trim() || !form.documentId.trim()) {
      setError("El teléfono y el documento son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim(),
        documentId: form.documentId.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender.trim() || undefined,
      }),
    });

    if (response.ok) {
      router.push("/portal/client");
    } else {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "No pudimos guardar tu perfil. Intenta de nuevo.");
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof form,
    type: string = "text",
    required = false,
  ) => (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      {required ? <span className="sr-only">(requerido)</span> : null}
      <input
        type={type}
        className="input h-11 text-sm"
        value={form[key]}
        required={required}
        disabled={saving}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Nombre", "name", "text")}
        {field("Apellido", "lastName", "text")}
        {field("Teléfono *", "phone", "tel", true)}
        {field("Número de documento *", "documentId", "text", true)}
        {field("Fecha de nacimiento", "dateOfBirth", "date")}
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          Género
          <select
            className="input h-11 text-sm"
            value={form.gender}
            disabled={saving}
            onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
          >
            <option value="">Prefiero no indicar</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar y continuar"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => router.push("/portal/client")}
          className="text-sm text-slate-500 transition hover:text-slate-700 dark:hover:text-slate-300"
        >
          Completar más tarde
        </button>
      </div>
    </form>
  );
}

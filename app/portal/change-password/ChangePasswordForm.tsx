"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/lib/http";

interface ChangePasswordFormProps {
  isMandatory: boolean;
  defaultDashboardPath: string;
}

export function ChangePasswordForm({ isMandatory, defaultDashboardPath }: ChangePasswordFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout("/api/users/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });

    if (response.ok) {
      setSuccess(true);
      setTimeout(() => router.push(defaultDashboardPath), 1500);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos cambiar la contraseña.");
    }

    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-sm">
      {isMandatory && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Tu contraseña fue restablecida por un administrador. Debes crear una nueva antes de continuar.
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Contraseña actual
          </label>
          <input
            type="password"
            className="input h-11 w-full text-sm"
            value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
            disabled={saving || success}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nueva contraseña
          </label>
          <input
            type="password"
            className="input h-11 w-full text-sm"
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
            disabled={saving || success}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Confirmar contraseña
          </label>
          <input
            type="password"
            className="input h-11 w-full text-sm"
            value={form.confirmPassword}
            onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            disabled={saving || success}
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">Contraseña actualizada. Redirigiendo...</p> : null}

        <button
          type="submit"
          className="w-full rounded-full bg-brand-teal py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          disabled={saving || success || !form.currentPassword || !form.newPassword || !form.confirmPassword}
        >
          {saving ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}

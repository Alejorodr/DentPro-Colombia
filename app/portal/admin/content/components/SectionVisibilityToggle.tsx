"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@/components/ui/Icon";
import { fetchWithTimeout } from "@/lib/http";

type VisibilityKey = "showSpecialists" | "showCampaigns";

type Props = {
  label: string;
  fieldKey: VisibilityKey;
  initialValue: boolean;
};

export function SectionVisibilityToggle({ label, fieldKey, initialValue }: Props) {
  const [visible, setVisible] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setSaving(true);
    setError(null);
    const next = !visible;

    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldKey]: next }),
    });

    if (!response.ok) {
      setError("No se pudo guardar.");
      setSaving(false);
      return;
    }

    setVisible(next);
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-label={visible ? `Ocultar sección ${label}` : `Mostrar sección ${label}`}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 disabled:opacity-60 ${
          visible ? "bg-brand-teal" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            visible ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <div className="flex items-center gap-2">
        {visible ? (
          <Eye size={16} weight="bold" className="text-brand-teal" />
        ) : (
          <EyeSlash size={16} weight="bold" className="text-slate-400" />
        )}
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {label}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {visible ? "Visible en el homepage" : "Oculta del homepage"}
          </p>
        </div>
      </div>
      {saving && <span className="ml-auto text-xs text-slate-400">Guardando...</span>}
      {error && <span className="ml-auto text-xs text-red-500">{error}</span>}
    </div>
  );
}

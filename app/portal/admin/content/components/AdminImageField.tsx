"use client";

import { useMemo, useState } from "react";

import { fetchWithTimeout } from "@/lib/http";
import type { MarketingUploadFolder } from "@/lib/marketing/images";

type UploadResponse = {
  url?: string;
  error?: string;
};

type AdminImageFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  uploadFolder: MarketingUploadFolder;
  recommendation: string;
  aspectRatio: string;
  placeholder?: string;
  disabled?: boolean;
};

export function AdminImageField({
  label,
  value,
  onChange,
  uploadFolder,
  recommendation,
  aspectRatio,
  placeholder,
  disabled,
}: AdminImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const previewSrc = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
  }, [value]);

  const handleFileUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", uploadFolder);

    const response = await fetchWithTimeout("/api/admin/marketing-images/upload", {
      method: "POST",
      body: formData,
    });

    const body = (await response.json().catch(() => null)) as UploadResponse | null;

    if (!response.ok || !body?.url) {
      setUploadError(body?.error ?? "No se pudo subir la imagen.");
      setUploading(false);
      return;
    }

    onChange(body.url);
    setUploading(false);
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-surface-muted md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <input
            className="input h-11 text-sm"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder ?? "https://..."}
            type="url"
            disabled={disabled || uploading}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recomendado: {recommendation} · Relación: {aspectRatio}
          </p>
          {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200">
          {uploading ? "Subiendo..." : "Subir archivo"}
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              void handleFileUpload(file);
              event.currentTarget.value = "";
            }}
            disabled={disabled || uploading}
          />
        </label>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-surface-muted dark:bg-surface-base/70">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt={`Preview ${label}`} className="h-40 w-full object-cover" />
        ) : (
          <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Sin imagen configurada.</p>
        )}
      </div>
    </div>
  );
}

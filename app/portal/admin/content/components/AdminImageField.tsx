"use client";

import { useMemo, useState } from "react";

import { MARKETING_IMAGE_MAX_BYTES, type MarketingUploadFolder } from "@/lib/marketing/images";

const MAX_DIMENSIONS: Record<MarketingUploadFolder, { w: number; h: number }> = {
  "marketing/homepage/hero": { w: 1200, h: 900 },
  "marketing/homepage/testimonial": { w: 400, h: 400 },
  "marketing/specialists": { w: 600, h: 600 },
  "marketing/campaigns": { w: 1000, h: 750 },
};

function compressToDataUrl(file: File, folder: MarketingUploadFolder): Promise<string> {
  return new Promise((resolve, reject) => {
    const { w: maxW, h: maxH } = MAX_DIMENSIONS[folder];
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas no disponible."));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/webp", 0.82);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo cargar la imagen para comprimir."));
    };

    img.src = objectUrl;
  });
}

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
  const inputId = `image-url-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  const uploadStatusId = `${inputId}-status`;

  const previewSrc = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("data:image/")) return trimmed;

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") return trimmed;
    } catch {
      return null;
    }

    return null;
  }, [value]);

  const handleFileUpload = async (file?: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("El archivo no parece ser una imagen válida.");
      return;
    }

    if (file.size <= 0) {
      setUploadError("El archivo está vacío. Selecciona otra imagen.");
      return;
    }

    if (file.size > MARKETING_IMAGE_MAX_BYTES) {
      setUploadError(`La imagen supera el límite (${Math.floor(MARKETING_IMAGE_MAX_BYTES / 1024 / 1024)}MB).`);
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const dataUrl = await compressToDataUrl(file, uploadFolder);
      onChange(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "No se pudo procesar la imagen.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <div className="grid gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-surface-muted md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <input
            id={inputId}
            className="input h-11 text-sm"
            value={value.startsWith("data:") ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder ?? "https://..."}
            type="url"
            disabled={disabled || uploading}
            aria-describedby={uploadStatusId}
          />
          {value.startsWith("data:") && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Imagen subida desde tu equipo. Guarda para aplicar.</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">Puedes pegar una URL HTTPS o subir un archivo desde tu equipo.</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Recomendado: {recommendation} · Relación: {aspectRatio} · Máximo {Math.floor(MARKETING_IMAGE_MAX_BYTES / 1024 / 1024)}MB.</p>
          <p id={uploadStatusId} className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            {uploading ? "Procesando imagen..." : uploadError ?? "Formato aceptado: JPG, PNG o WEBP."}
          </p>
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200">
          {uploading ? "Procesando..." : "Subir archivo"}
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp,image/gif"
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
          <img src={previewSrc} alt={`Preview ${label}`} className="h-40 w-full object-cover" loading="lazy" />
        ) : value.trim() ? (
          <p className="p-3 text-xs text-amber-700 dark:text-amber-300">La URL actual no es válida para vista previa. Usa una URL http(s) completa o sube un archivo.</p>
        ) : (
          <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Sin imagen configurada.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { MARKETING_IMAGE_MAX_BYTES, type MarketingUploadFolder } from "@/lib/marketing/images";

import { ImageCropModal } from "./ImageCropModal";

const MAX_DIMENSIONS: Record<MarketingUploadFolder, { w: number; h: number }> = {
  "marketing/homepage/hero": { w: 1200, h: 900 },
  "marketing/homepage/testimonial": { w: 400, h: 400 },
  "marketing/specialists": { w: 600, h: 600 },
  "marketing/campaigns": { w: 1000, h: 750 },
};

const ASPECT_RATIO: Record<MarketingUploadFolder, number> = {
  "marketing/homepage/hero": 4 / 3,
  "marketing/homepage/testimonial": 1,
  "marketing/specialists": 1,
  "marketing/campaigns": 4 / 3,
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
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const inputId = `image-url-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;

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

  const handleFileSelect = (file?: File | null) => {
    if (!file) return;

    setFileError(null);

    if (!file.type.startsWith("image/")) {
      setFileError("El archivo no parece ser una imagen válida.");
      return;
    }

    if (file.size <= 0) {
      setFileError("El archivo está vacío.");
      return;
    }

    if (file.size > MARKETING_IMAGE_MAX_BYTES) {
      setFileError(`La imagen supera el límite de ${Math.floor(MARKETING_IMAGE_MAX_BYTES / 1024 / 1024)}MB.`);
      return;
    }

    // Open the crop modal with a blob URL
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  };

  const handleCropConfirm = (dataUrl: string) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    onChange(dataUrl);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const { w: maxW, h: maxH } = MAX_DIMENSIONS[uploadFolder];
  const aspect = ASPECT_RATIO[uploadFolder];

  return (
    <>
      {/* Crop modal — rendered outside main layout so it's full-screen */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          aspect={aspect}
          maxW={maxW}
          maxH={maxH}
          label={label}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <div className="space-y-2 md:col-span-2">
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          {label}
        </label>

        <div className="grid gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-surface-muted md:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <input
              id={inputId}
              className="input h-11 text-sm"
              value={value.startsWith("data:") ? "" : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder ?? "https://..."}
              type="url"
              disabled={disabled}
            />
            {value.startsWith("data:") && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Imagen recortada desde tu equipo. Guarda para aplicar.
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pega una URL HTTPS o sube desde tu equipo — se abrirá la herramienta de recorte.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recomendado: {recommendation} · Relación: {aspectRatio} · Máx {Math.floor(MARKETING_IMAGE_MAX_BYTES / 1024 / 1024)}MB.
            </p>
            {fileError && (
              <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>
            )}
          </div>

          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-xs font-semibold uppercase text-slate-600 transition hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted dark:text-slate-200">
            Subir y recortar
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFileSelect(file);
                e.currentTarget.value = "";
              }}
              disabled={disabled}
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-surface-muted dark:bg-surface-base/70">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={`Preview ${label}`}
              className="h-40 w-full object-cover"
              loading="lazy"
            />
          ) : value.trim() ? (
            <p className="p-3 text-xs text-amber-700 dark:text-amber-300">
              La URL actual no es válida para vista previa.
            </p>
          ) : (
            <p className="p-3 text-xs text-slate-500 dark:text-slate-400">Sin imagen configurada.</p>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// Build initial centered crop using display dimensions (not natural)
function buildInitialCrop(displayW: number, displayH: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, displayW, displayH),
    displayW,
    displayH,
  );
}

type Props = {
  src: string;
  aspect: number;
  maxW: number;
  maxH: number;
  label: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
};

export function ImageCropModal({ src, aspect, maxW, maxH, label, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  // Store display size at load time so confirm button uses consistent scale
  const displaySizeRef = useRef<{ w: number; h: number } | null>(null);

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const displayW = img.width;
      const displayH = img.height;

      // Guard: image must have rendered dimensions
      if (!displayW || !displayH) return;

      displaySizeRef.current = { w: displayW, h: displayH };

      const initial = buildInitialCrop(displayW, displayH, aspect);
      setCrop(initial);
      // Pre-initialise completedCrop so confirm works without dragging
      setCompletedCrop(convertToPixelCrop(initial, displayW, displayH));
    },
    [aspect],
  );

  const handleConfirm = () => {
    const img = imgRef.current;
    const stored = displaySizeRef.current;
    if (!img || !stored || !completedCrop || completedCrop.width <= 0) return;

    setCropError(null);

    try {
      const scaleX = img.naturalWidth / stored.w;
      const scaleY = img.naturalHeight / stored.h;

      const srcX = completedCrop.x * scaleX;
      const srcY = completedCrop.y * scaleY;
      const srcW = completedCrop.width * scaleX;
      const srcH = completedCrop.height * scaleY;

      // Clamp source coords to natural dimensions (safeguard for rounding)
      const clampedSrcX = Math.max(0, Math.min(srcX, img.naturalWidth - 1));
      const clampedSrcY = Math.max(0, Math.min(srcY, img.naturalHeight - 1));
      const clampedSrcW = Math.min(srcW, img.naturalWidth - clampedSrcX);
      const clampedSrcH = Math.min(srcH, img.naturalHeight - clampedSrcY);

      if (clampedSrcW <= 0 || clampedSrcH <= 0) {
        setCropError("El área de recorte es inválida. Ajusta el recuadro y vuelve a intentar.");
        return;
      }

      // Scale output to fit within maxW × maxH
      const cropAspect = clampedSrcW / clampedSrcH;
      let outW = maxW;
      let outH = Math.round(maxW / cropAspect);
      if (outH > maxH) {
        outH = maxH;
        outW = Math.round(maxH * cropAspect);
      }

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCropError("El navegador no permite operaciones de canvas.");
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, clampedSrcX, clampedSrcY, clampedSrcW, clampedSrcH, 0, 0, outW, outH);

      const dataUrl = canvas.toDataURL("image/webp", 0.82);
      onConfirm(dataUrl);
    } catch (err) {
      setCropError(
        err instanceof Error ? err.message : "No se pudo procesar el recorte. Intenta con otra imagen.",
      );
    }
  };

  const aspectLabel = aspect === 1 ? "1:1" : Math.abs(aspect - 4 / 3) < 0.01 ? "4:3" : aspect.toFixed(2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-surface-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-surface-muted">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Recortar imagen
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-teal">
              Relación {aspectLabel}
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-surface-muted"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Crop area */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-4 dark:bg-surface-base">
          {loadError ? (
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-red-600">
                No se pudo cargar la imagen en el editor.
              </p>
              <p className="text-xs text-slate-500">
                Verifica que el archivo sea un JPG, PNG, WEBP o GIF válido. Los archivos HEIC
                (iPhone) deben convertirse primero.
              </p>
            </div>
          ) : (
            <ReactCrop
              crop={crop}
              onChange={(pixelCrop, pctCrop) => {
                setCrop(pctCrop);
                setCompletedCrop(pixelCrop);
              }}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              keepSelection
              style={{ maxHeight: "55vh" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={src}
                alt="Imagen a recortar"
                onLoad={onImageLoad}
                onError={() => setLoadError(true)}
                style={{ maxHeight: "55vh", maxWidth: "100%", display: "block" }}
              />
            </ReactCrop>
          )}
        </div>

        {/* Instructions / error */}
        <div className="border-t border-slate-100 px-5 py-2 dark:border-surface-muted">
          {cropError ? (
            <p className="text-xs text-red-600">{cropError}</p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Arrastra el recuadro para reposicionar · Tira de las esquinas para ajustar el tamaño.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-surface-muted">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-surface-muted dark:text-slate-200 dark:hover:bg-surface-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loadError || !completedCrop || completedCrop.width <= 0}
            className="rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Recortar y guardar
          </button>
        </div>
      </div>
    </div>
  );
}

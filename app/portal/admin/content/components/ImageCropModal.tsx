"use client";

import { useCallback, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

function cropToWebP(img: HTMLImageElement, crop: PixelCrop, maxW: number, maxH: number): string {
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const srcW = crop.width * scaleX;
  const srcH = crop.height * scaleY;

  // Scale output to fit within maxW × maxH
  const cropAspect = srcW / srcH;
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
  if (!ctx) throw new Error("Canvas no disponible.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    srcW,
    srcH,
    0,
    0,
    outW,
    outH,
  );

  return canvas.toDataURL("image/webp", 0.82);
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
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [loadError, setLoadError] = useState(false);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      setCrop(centerAspectCrop(naturalWidth, naturalHeight, aspect));
    },
    [aspect],
  );

  const handleConfirm = () => {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0) return;
    try {
      const dataUrl = cropToWebP(imgRef.current, completedCrop, maxW, maxH);
      onConfirm(dataUrl);
    } catch {
      setLoadError(true);
    }
  };

  const aspectLabel = aspect === 1 ? "1:1" : aspect === 4 / 3 ? "4:3" : `${aspect.toFixed(2)}:1`;

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
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-surface-muted dark:text-slate-300">
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
        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4 dark:bg-surface-base">
          {loadError ? (
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-red-600">
                Este formato de imagen no es compatible con el navegador.
              </p>
              <p className="text-xs text-slate-500">
                Convierte la imagen a JPG, PNG o WEBP antes de subir.
              </p>
            </div>
          ) : (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              keepSelection
              className="max-h-[55vh]"
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

        {/* Instructions */}
        <div className="border-t border-slate-100 px-5 py-2 dark:border-surface-muted">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arrastra el recuadro para reposicionarlo. Tira de las esquinas para ajustar el área de corte.
          </p>
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
            disabled={loadError || !completedCrop || completedCrop.width === 0}
            className="rounded-full bg-brand-teal px-5 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            Recortar y guardar
          </button>
        </div>
      </div>
    </div>
  );
}

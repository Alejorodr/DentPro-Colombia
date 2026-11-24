import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-slate-200/80 dark:bg-surface-muted/70", className)}
      {...props}
    />
  );
}

type SkeletonRowsProps = {
  /** Texto para lectores de pantalla, p. ej. "Cargando citas". */
  label: string;
  rows?: number;
  /** Alto de cada fila (clase de Tailwind). */
  rowClassName?: string;
  className?: string;
};

/** Marcador de carga para listas y paneles: filas con pulso en lugar de un texto suelto (DOG-12). */
export function SkeletonRows({ label, rows = 3, rowClassName = "h-14", className }: SkeletonRowsProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("space-y-3", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={rowClassName} />
      ))}
    </div>
  );
}

/** Marcador de carga para una fila de tarjetas de métricas. */
export function SkeletonStatGrid({ label, count = 4, className }: { label: string; count?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("contents", className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-28" />
      ))}
    </div>
  );
}

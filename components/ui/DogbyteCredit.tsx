type DogbyteCreditProps = {
  /** `dark` para fondos oscuros (footer del home); `light` para el resto. */
  tone?: "light" | "dark";
  className?: string;
};

/**
 * Crédito del desarrollador (DOG-38). La marca DOGBYTE va siempre en mayúsculas y con Outfit.
 */
export function DogbyteCredit({ tone = "light", className = "" }: DogbyteCreditProps) {
  const brandColor =
    tone === "dark" ? "text-slate-300 dark:text-slate-400" : "text-slate-600 dark:text-slate-300";

  return (
    <span className={className}>
      Desarrollado por{" "}
      <span className={`font-(family-name:--font-outfit) font-semibold uppercase tracking-wide ${brandColor}`}>
        DOGBYTE
      </span>
    </span>
  );
}

/** Franja de crédito para páginas que no tienen footer propio. */
export function DogbyteCreditFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white/80 px-6 py-4 text-center text-xs text-slate-500 dark:border-surface-muted dark:bg-surface-base/80 dark:text-slate-400">
      <DogbyteCredit />
    </footer>
  );
}

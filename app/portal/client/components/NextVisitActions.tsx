import Link from "next/link";

export function NextVisitActions({ detailsHref }: { detailsHref: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <Link
        href="/portal/client/book"
        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 dark:border-surface-muted/70 dark:text-slate-200"
      >
        Reservar nuevo turno
      </Link>
      <Link
        href={detailsHref}
        className="rounded-xl bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-indigo"
      >
        Gestionar cita
      </Link>
    </div>
  );
}

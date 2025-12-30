import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDefaultDashboardPath, isUserRole, roleLabels, type UserRole } from "@/lib/auth/roles";
import type { PatientSummary } from "@/lib/api/types";
import { PatientsTable } from "./PatientsTable";

async function fetchPatients() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const url = host ? `${protocol}://${host}/api/patients` : "/api/patients";

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los pacientes.");
  }

  return (await response.json()) as PatientSummary[];
}

export default async function PatientsPage(props: any) {
  const { params } = props as { params?: { role?: string } };
  const requestedRole = params?.role ?? "";

  if (!isUserRole(requestedRole)) {
    notFound();
  }

  const session = await auth();

  if (!session || !session.user?.role || !isUserRole(session.user.role)) {
    redirect(`/login?callbackUrl=/${requestedRole}`);
  }

  if (session.user.role !== requestedRole) {
    redirect(getDefaultDashboardPath(session.user.role));
  }

  const patients = await fetchPatients();
  const roleLabel = roleLabels[requestedRole as UserRole];

  return (
    <main className="space-y-6 py-6">
      <header className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-elevated dark:ring-surface-muted">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
          {roleLabel}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Pacientes</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Consulta y filtra los pacientes registrados en el sistema.
        </p>
      </header>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-colors duración-300 dark:bg-surface-elevated dark:ring-surface-muted">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Listado</h2>
          <Link
            href={`/${requestedRole}`}
            className="text-sm font-semibold text-brand-teal transición-colors hover:text-brand-indigo dark:text-accent-cyan"
          >
            Volver al tablero
          </Link>
        </div>

        <PatientsTable patients={patients} />
      </section>
    </main>
  );
}

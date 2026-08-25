import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NewAppointmentForm } from "@/app/appointments/new/NewAppointmentForm";

export const metadata: Metadata = {
  title: "Reservar turno",
  description:
    "Agenda tu cita en DentPro Colombia. Elegí especialidad, profesional y horario disponible — confirmación inmediata.",
  robots: { index: false, follow: false },
};

type NewAppointmentPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewAppointmentPage({
  searchParams = Promise.resolve({}),
}: NewAppointmentPageProps) {
  const [session, resolvedSearchParams] = await Promise.all([auth(), searchParams]);

  if (!session?.user?.role) {
    // Preserve the incoming query string (notably `?professionalId=…` from the public
    // homepage cards) across the login round-trip — otherwise the preselection is lost
    // for exactly the logged-out visitors the flow was built for.
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearchParams ?? {})) {
      if (typeof value === "string") {
        query.append(key, value);
      } else if (Array.isArray(value)) {
        for (const item of value) query.append(key, item);
      }
    }
    const queryString = query.toString();
    const callbackUrl = queryString ? `/appointments/new?${queryString}` : "/appointments/new";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Nuevo turno</p>
        <h1 className="text-2xl font-semibold text-slate-900">Agenda una cita</h1>
        <p className="text-sm text-slate-600">Selecciona especialidad, profesional y horario disponible.</p>
      </header>
      <NewAppointmentForm role={session.user.role} />
    </div>
  );
}

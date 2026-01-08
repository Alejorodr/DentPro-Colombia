import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NewAppointmentForm } from "@/app/appointments/new/NewAppointmentForm";

export default async function NewAppointmentPage() {
  const session = await auth();

  if (!session?.user?.role) {
    redirect("/auth/login?callbackUrl=/appointments/new");
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

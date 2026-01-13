import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";
import { getDefaultDashboardPath, roleFromSlug, roleLabels } from "@/lib/auth/roles";
import { AppointmentsList } from "@/app/portal/components/AppointmentsList";

export const dynamic = "force-dynamic";

export default async function PortalRolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const requestedRole = roleFromSlug(role);

  if (!requestedRole) {
    notFound();
  }

  const session = await auth();

  if (!session?.user?.role) {
    redirect(`/login?callbackUrl=/portal/${role}`);
  }

  if (session.user.role !== requestedRole) {
    redirect(getDefaultDashboardPath(session.user.role));
  }

  const prisma = getPrismaClient();
  let appointments: any[] = [];

  if (requestedRole === "ADMINISTRADOR" || requestedRole === "RECEPCIONISTA") {
    appointments = await prisma.appointment.findMany({
      include: {
        patient: { include: { user: true } },
        professional: { include: { user: true, specialty: true } },
        timeSlot: true,
      },
      orderBy: { timeSlot: { startAt: "asc" } },
      take: 20,
    });
  }

  if (requestedRole === "PROFESIONAL") {
    const professional = await prisma.professionalProfile.findUnique({
      where: { userId: session.user.id ?? "" },
    });

    if (professional) {
      appointments = await prisma.appointment.findMany({
        where: { professionalId: professional.id },
        include: {
          patient: { include: { user: true } },
          professional: { include: { user: true, specialty: true } },
          timeSlot: true,
        },
        orderBy: { timeSlot: { startAt: "asc" } },
        take: 20,
      });
    }
  }

  if (requestedRole === "PACIENTE") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id ?? "" },
    });

    if (patient) {
      appointments = await prisma.appointment.findMany({
        where: { patientId: patient.id },
        include: {
          patient: { include: { user: true } },
          professional: { include: { user: true, specialty: true } },
          timeSlot: true,
        },
        orderBy: { timeSlot: { startAt: "asc" } },
        take: 20,
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Portal {roleLabels[requestedRole]}</p>
        <h1 className="text-2xl font-semibold text-slate-900">Resumen de agenda</h1>
        <p className="text-sm text-slate-600">
          Gestiona tus citas y tareas prioritarias desde un solo lugar.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Citas próximas</h2>
            <p className="text-sm text-slate-600">Últimos 20 turnos según tu rol.</p>
          </div>
          {requestedRole === "PACIENTE" ? (
            <a
              href="/appointments/new"
              className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
            >
              Crear turno
            </a>
          ) : null}
        </div>
        <div className="mt-6">
          <AppointmentsList initialAppointments={appointments} role={requestedRole} />
        </div>
      </section>
    </div>
  );
}

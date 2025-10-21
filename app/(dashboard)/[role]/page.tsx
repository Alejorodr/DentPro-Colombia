import type { Session } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions, getServerAuthSession } from "@/auth";
import type { NextAuthConfig } from "@/auth";
import { listAppointments } from "@/lib/api/appointments";
import { listPatients } from "@/lib/api/patients";
import { listSchedules } from "@/lib/api/schedules";
import { getDefaultDashboardPath, isUserRole, roleLabels, userRoles } from "@/lib/auth/roles";

import { QuickBookingForm } from "../components/QuickBookingForm";
import { SpecialistsShowcase } from "../components/SpecialistsShowcase";

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type RoleParam = (typeof userRoles)[number];

interface DashboardSection {
  title: string;
  description: string;
  items: string[];
}

async function buildSections(role: RoleParam): Promise<DashboardSection[]> {
  if (role === "patient") {
    const appointments = await listAppointments();
    const items = appointments.slice(0, 3).map((appointment) => {
      const when = dateFormatter.format(new Date(appointment.scheduledAt));
      return `${when} · ${appointment.service}`;
    });
    return [
      {
        title: "Próximos turnos",
        description: "Confirma tu asistencia y consulta el detalle de cada cita.",
        items: items.length ? items : ["Aún no tienes turnos programados."],
      },
    ];
  }

  if (role === "professional") {
    const schedules = await listSchedules();
    const items = schedules
      .filter((slot) => slot.available)
      .slice(0, 4)
      .map((slot) => `${dateFormatter.format(new Date(slot.start))} · Disponible`);
    return [
      {
        title: "Próximos espacios libres",
        description: "Gestiona tus espacios disponibles y confirma asignaciones.",
        items: items.length ? items : ["No hay espacios disponibles para mostrar."],
      },
    ];
  }

  if (role === "reception") {
    const [appointments, patients] = await Promise.all([listAppointments(), listPatients()]);
    return [
      {
        title: "Turnos pendientes",
        description: "Agenda y coordina los siguientes pasos con cada paciente.",
        items: appointments.map((appointment) => `${appointment.service} · ${appointment.status}`),
      },
      {
        title: "Pacientes frecuentes",
        description: "Contactos a la mano para confirmaciones rápidas.",
        items: patients.map((patient) => `${patient.name} · ${patient.phone}`),
      },
    ];
  }

  const [appointments, schedules, patients] = await Promise.all([
    listAppointments(),
    listSchedules(),
    listPatients(),
  ]);

  return [
    {
      title: "Indicadores generales",
      description: "Resumen operativo del día.",
      items: [
        `${appointments.length} turnos programados`,
        `${schedules.filter((slot) => slot.available).length} espacios disponibles`,
        `${patients.length} pacientes activos en seguimiento`,
      ],
    },
  ];
}

type RolePageProps = {
  params?: Promise<{ role: string }>;
};

type SessionWithRole = Session & {
  user: NonNullable<Session["user"]> & { role: RoleParam };
};

export default async function RoleDashboardPage({ params }: RolePageProps) {
  const resolvedParams = params ? await params : null;
  if (!resolvedParams) {
    notFound();
  }

  const requestedRole = resolvedParams.role;
  if (!isUserRole(requestedRole)) {
    notFound();
  }

  const session = (await getServerAuthSession()) as SessionWithRole | null;
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(getDefaultDashboardPath(requestedRole))}`);
  }

  const userRole = session.user.role;
  if (userRole !== requestedRole) {
    redirect(getDefaultDashboardPath(userRole));
  }

  const sections = await buildSections(userRole);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Dashboard {roleLabels[userRole]}</p>
        <h1 className="text-3xl font-bold">Hola, {session.user.name ?? "equipo DentPro"}</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Gestiona la información clave de tu rol y coordina las próximas acciones con el equipo.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {userRole === "patient" ? <QuickBookingForm /> : null}
        <SpecialistsShowcase />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-surface-elevated"
          >
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">{section.description}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="material-symbols-rounded text-brand-teal dark:text-accent-cyan">check_circle</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

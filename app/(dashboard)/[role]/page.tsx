import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  getDefaultDashboardPath,
  isUserRole,
  roleLabels,
  type UserRole,
} from "@/lib/auth/roles";

interface DashboardSection {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  routes: { label: string; path: string }[];
  icon: "agenda" | "patients" | "tasks" | "insights";
}

const sectionsByRole: Record<UserRole, DashboardSection[]> = {
  patient: [
    {
      id: "agenda",
      title: "Mi agenda",
      description:
        "Consulta tus próximas citas y recibe recordatorios automáticos.",
      highlights: [
        "Confirma o reprograma directamente desde el tablero",
        "Añade notas previas para tu especialista",
      ],
      routes: [{ label: "Citas", path: "/patient/appointments" }],
      icon: "agenda",
    },
    {
      id: "pacientes",
      title: "Mis datos",
      description:
        "Mantén tu información de contacto y consentimientos actualizados.",
      highlights: [
        "Descarga tus documentos y resultados",
        "Actualiza teléfono y datos de contacto",
      ],
      routes: [{ label: "Pacientes", path: "/patient/patients" }],
      icon: "patients",
    },
  ],
  professional: [
    {
      id: "agenda",
      title: "Agenda clínica",
      description:
        "Visualiza tus citas confirmadas y pendientes por paciente.",
      highlights: [
        "Bloquea horarios y marca asistencias",
        "Accede al detalle clínico antes de la cita",
      ],
      routes: [
        { label: "Citas", path: "/professional/appointments" },
        { label: "Horarios", path: "/professional/schedules" },
      ],
      icon: "agenda",
    },
    {
      id: "pacientes",
      title: "Pacientes asignados",
      description:
        "Revisa historial, órdenes y documentos compartidos contigo.",
      highlights: [
        "Filtra por urgencia o especialidad",
        "Comparte indicaciones postoperatorias",
      ],
      routes: [{ label: "Pacientes", path: "/professional/patients" }],
      icon: "patients",
    },
  ],
  reception: [
    {
      id: "agenda",
      title: "Agenda en tiempo real",
      description:
        "Administra citas, confirma asistencia y reasigna especialistas.",
      highlights: [
        "Crea citas desde llamadas entrantes",
        "Envía recordatorios por WhatsApp o correo",
      ],
      routes: [
        { label: "Citas", path: "/reception/appointments" },
        { label: "Horarios", path: "/reception/schedules" },
      ],
      icon: "agenda",
    },
    {
      id: "pacientes",
      title: "Pacientes",
      description:
        "Consulta datos de contacto, pólizas y saldos pendientes.",
      highlights: [
        "Valida cobertura y asegurable antes de la cita",
        "Actualiza datos de facturación y autorizaciones",
      ],
      routes: [{ label: "Pacientes", path: "/reception/patients" }],
      icon: "patients",
    },
  ],
  admin: [
    {
      id: "insights",
      title: "Indicadores",
      description:
        "Sigue la ocupación, cancelaciones y desempeño por especialidad.",
      highlights: [
        "Exporta reportes para gerencia",
        "Configura metas semanales y mensuales",
      ],
      routes: [{ label: "Citas", path: "/admin/appointments" }],
      icon: "insights",
    },
    {
      id: "equipo",
      title: "Equipo y roles",
      description:
        "Gestiona accesos, roles y disponibilidad de profesionales.",
      highlights: [
        "Invita nuevos usuarios y restablece contraseñas",
        "Define horarios y permisos para cada rol",
      ],
      routes: [
        { label: "Pacientes", path: "/admin/patients" },
        { label: "Horarios", path: "/admin/schedules" },
      ],
      icon: "tasks",
    },
  ],
};

function getSectionIcon(section: DashboardSection) {
  // Iconos simplificados sin librería externa para evitar errores en build
  switch (section.icon) {
    case "agenda":
      return (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal/10 text-xs font-bold text-brand-teal"
          aria-hidden="true"
        >
          A
        </span>
      );
    case "patients":
      return (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-indigo/10 text-xs font-bold text-brand-indigo"
          aria-hidden="true"
        >
          P
        </span>
      );
    case "tasks":
      return (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-sky/10 text-xs font-bold text-brand-sky"
          aria-hidden="true"
        >
          T
        </span>
      );
    case "insights":
      return (
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-500"
          aria-hidden="true"
        >
          I
        </span>
      );
    default:
      return null;
  }
}

export default async function RoleDashboardPage(props: any) {
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

  const sections = sectionsByRole[requestedRole as UserRole];
  const userLabel = roleLabels[requestedRole as UserRole];

  return (
    <main className="space-y-8 py-6">
      <header className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-elevated dark:ring-surface-muted">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
          {userLabel}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Tablero de {userLabel}
          </h1>
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted dark:text-accent-cyan">
            Acceso validado
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Administra tus módulos principales desde aquí. Usa las rutas sugeridas
          para navegar por agenda, pacientes y reportes según tu rol.
        </p>
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span
            className="h-4 w-4 rounded-full bg-brand-teal"
            aria-hidden="true"
          />
          <span>
            Si necesitas cambiar de rol, cierra sesión e ingresa con tus
            credenciales asignadas.
          </span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.id}
            id={section.id}
            className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-colors duration-300 dark:bg-surface-elevated dark:ring-surface-muted"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-surface-muted dark:text-slate-200">
                  {getSectionIcon(section)}
                  <span>{section.title}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {section.description}
                </p>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {section.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2 w-2 rounded-full bg-brand-teal"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 transition-colors duration-300 dark:border-surface-muted dark:bg-surface-muted/40 dark:text-slate-200">
              <p className="mb-2 font-semibold text-slate-900 dark:text-white">
                Rutas sugeridas
              </p>
              <ul className="space-y-2">
                {section.routes.map((route) => (
                  <li
                    key={route.path}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold">{route.label}</p>
                      <code className="rounded bg-white px-2 py-1 text-xs text-brand-teal ring-1 ring-brand-light dark:bg-surface-elevated dark:text-accent-cyan dark:ring-surface-muted">
                        {route.path}
                      </code>
                    </div>
                    <Link
                      href={route.path}
                      prefetch={false}
                      className="text-xs font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan"
                    >
                      Abrir
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

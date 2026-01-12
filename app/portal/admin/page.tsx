import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";

export default async function AdminPortalPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">Portal Administrador</p>
        <h1 className="text-2xl font-semibold text-slate-900">Gestión general</h1>
        <p className="text-sm text-slate-600">
          Accede a los módulos clave para administrar usuarios, especialidades, profesionales y citas.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/portal/admin/users", title: "Usuarios", description: "Crear usuarios, cambiar roles y resetear accesos." },
          {
            href: "/portal/admin/specialties",
            title: "Especialidades",
            description: "Gestiona la oferta clínica y la duración base de turnos.",
          },
          {
            href: "/portal/admin/professionals",
            title: "Profesionales",
            description: "Asocia especialistas con sus perfiles clínicos.",
          },
          { href: "/portal/admin/appointments", title: "Citas", description: "Visualiza la agenda completa." },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-teal"
          >
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

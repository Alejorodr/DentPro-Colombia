"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import type { AuthSession } from "@/auth";
import { roleFromSlug, roleLabels, roleSlugMap, type UserRole } from "@/lib/auth/roles";

interface PortalShellProps {
  children: React.ReactNode;
  session: AuthSession;
}

interface NavItem {
  label: string;
  href: string;
}

const navByRole: Record<UserRole, NavItem[]> = {
  PACIENTE: [
    { label: "Mis turnos", href: "/appointments/new" },
    { label: "Mis citas", href: "/portal/client" },
  ],
  PROFESIONAL: [
    { label: "Agenda", href: "/portal/professional" },
  ],
  RECEPCIONISTA: [
    { label: "Agenda global", href: "/portal/receptionist" },
    { label: "Crear paciente", href: "/portal/receptionist" },
  ],
  ADMINISTRADOR: [
    { label: "Usuarios", href: "/portal/admin/users" },
    { label: "Especialidades", href: "/portal/admin/specialties" },
    { label: "Profesionales", href: "/portal/admin/professionals" },
    { label: "Citas", href: "/portal/admin/appointments" },
  ],
};

function resolveActiveRole(pathname: string, fallback?: UserRole): UserRole | null {
  const segment = pathname.split("/").filter(Boolean).at(1) ?? "";
  const role = roleFromSlug(segment);
  return role ?? fallback ?? null;
}

export function PortalShell({ children, session }: PortalShellProps) {
  const pathname = usePathname();
  const fallbackRole = session?.user?.role ?? null;
  const activeRole = resolveActiveRole(pathname, fallbackRole ?? undefined);
  const navItems = activeRole ? navByRole[activeRole] : [];
  const roleLabel = activeRole ? roleLabels[activeRole] : "";
  const userName = session?.user?.name ?? "Usuario";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-surface-base dark:text-white">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-surface-muted dark:bg-surface-elevated/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">
              {roleLabel}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Hola, {userName}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <nav className="hidden gap-2 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    pathname === item.href
                      ? "bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan"
                      : "text-slate-600 hover:text-brand-teal dark:text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {activeRole ? (
              <Link
                href={`/portal/${roleSlugMap[activeRole]}`}
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-brand-indigo"
              >
                Inicio
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted dark:text-slate-200"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

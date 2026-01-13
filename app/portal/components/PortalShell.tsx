"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { CalendarCheck, ClipboardText, Gear, House, SquaresFour, Stethoscope, UserCircle, Users } from "@phosphor-icons/react";

import type { AuthSession } from "@/auth";
import { roleFromSlug, roleLabels, roleSlugMap, type UserRole } from "@/lib/auth/roles";
import { Sidebar } from "@/app/portal/components/layout/Sidebar";
import { Topbar } from "@/app/portal/components/layout/Topbar";

interface PortalShellProps {
  children: React.ReactNode;
  session: AuthSession;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof House;
}

const navByRole: Record<UserRole, NavItem[]> = {
  PACIENTE: [
    { label: "Mis turnos", href: "/appointments/new", icon: CalendarCheck },
    { label: "Mis citas", href: "/portal/client", icon: ClipboardText },
  ],
  PROFESIONAL: [{ label: "Agenda", href: "/portal/professional", icon: CalendarCheck }],
  RECEPCIONISTA: [
    { label: "Agenda global", href: "/portal/receptionist", icon: CalendarCheck },
    { label: "Crear paciente", href: "/portal/receptionist", icon: Users },
  ],
  ADMINISTRADOR: [
    { label: "Dashboard", href: "/portal/admin", icon: House },
    { label: "Usuarios", href: "/portal/admin/users", icon: Users },
    { label: "Profesionales", href: "/portal/admin/professionals", icon: UserCircle },
    { label: "Especialidades", href: "/portal/admin/specialties", icon: Stethoscope },
    { label: "Turnos / Citas", href: "/portal/admin/appointments", icon: CalendarCheck },
    { label: "CMS", href: "/portal/admin/content", icon: SquaresFour },
  ],
};

const settingsByRole: Partial<Record<UserRole, NavItem[]>> = {
  ADMINISTRADOR: [{ label: "Settings", href: "/portal/admin/settings", icon: Gear }],
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
  const settingsItems = activeRole ? settingsByRole[activeRole] ?? [] : [];
  const roleLabel = activeRole ? roleLabels[activeRole] : "";
  const userName = session?.user?.name ?? "Usuario";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const homeLink = useMemo(() => {
    if (!activeRole) {
      return "/";
    }

    return `/portal/${roleSlugMap[activeRole]}`;
  }, [activeRole]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-surface-base dark:text-white">
      <Sidebar
        items={navItems}
        settingsItems={settingsItems}
        pathname={pathname}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSignOut={() => signOut({ callbackUrl: "/auth/login" })}
      />
      <div className="flex min-h-screen flex-col md:pl-72">
        <Topbar roleLabel={roleLabel} userName={userName} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="w-full px-6 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span>Inicio rápido</span>
              <Link
                href={homeLink}
                className="font-semibold text-brand-teal transition hover:text-brand-indigo dark:text-accent-cyan"
              >
                Ir al portal
              </Link>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

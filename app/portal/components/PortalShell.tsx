"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import {
  CalendarCheck,
  ClipboardText,
  Gear,
  House,
  ShieldCheck,
  SquaresFour,
  Users,
} from "@/components/ui/Icon";

import type { AuthSession } from "@/auth";
import { roleFromSlug, roleLabels, roleSlugMap, type UserRole } from "@/lib/auth/roles";
import type { ClinicInfo } from "@/lib/clinic";
import { Sidebar } from "@/app/portal/components/layout/Sidebar";
import { Topbar } from "@/app/portal/components/layout/Topbar";
import { ClientPortalShell } from "@/app/portal/client/components/ClientPortalShell";
import { ReceptionistShell } from "@/app/portal/receptionist/components/ReceptionistShell";
import { ProfessionalShell } from "@/app/portal/professional/components/ProfessionalShell";
import { AdminGlobalSearch } from "@/app/portal/admin/_components/GlobalSearchBox";
import { NotificationsDropdown } from "@/app/portal/admin/_components/NotificationsDropdown";

interface PortalShellProps {
  children: React.ReactNode;
  session: AuthSession;
  clinic: ClinicInfo;
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
    { label: "Dashboard", href: "/portal/receptionist/dashboard", icon: House },
    { label: "Schedule", href: "/portal/receptionist/schedule", icon: CalendarCheck },
    { label: "Patients", href: "/portal/receptionist/patients", icon: Users },
    { label: "Staff", href: "/portal/receptionist/staff", icon: Users },
    { label: "Billing", href: "/portal/receptionist/billing", icon: ClipboardText },
    { label: "Settings", href: "/portal/receptionist/settings", icon: Gear },
  ],
  ADMINISTRADOR: [
    { label: "Dashboard", href: "/portal/admin", icon: House },
    { label: "Staff Management", href: "/portal/admin/staff", icon: Users },
    { label: "Patient Records", href: "/portal/admin/patients", icon: Users },
    { label: "Services & Pricing", href: "/portal/admin/services", icon: ClipboardText },
    { label: "Content CMS", href: "/portal/admin/content", icon: SquaresFour },
    { label: "Clinical Templates", href: "/portal/admin/templates", icon: ClipboardText },
    { label: "Audit Logs", href: "/portal/admin/audit", icon: ShieldCheck },
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

export function PortalShell({ children, session, clinic }: PortalShellProps) {
  const pathname = usePathname();
  const fallbackRole = session?.user?.role ?? null;
  const activeRole = resolveActiveRole(pathname, fallbackRole ?? undefined);
  const navItems = activeRole ? navByRole[activeRole] : [];
  const settingsItems = activeRole ? settingsByRole[activeRole] ?? [] : [];
  const roleLabel = activeRole ? roleLabels[activeRole] : "";
  const userName = session?.user?.name ?? "Usuario";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdmin = activeRole === "ADMINISTRADOR";

  const homeLink = useMemo(() => {
    if (!activeRole) {
      return "/";
    }

    return `/portal/${roleSlugMap[activeRole]}`;
  }, [activeRole]);

  if (activeRole === "PACIENTE") {
    return (
      <ClientPortalShell session={session} clinic={clinic}>
        {children}
      </ClientPortalShell>
    );
  }

  if (activeRole === "RECEPCIONISTA") {
    return <ReceptionistShell session={session}>{children}</ReceptionistShell>;
  }

  if (activeRole === "PROFESIONAL") {
    return (
      <ProfessionalShell session={session} clinic={clinic}>
        {children}
      </ProfessionalShell>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-surface-base dark:text-white">
      <Sidebar
        items={navItems}
        settingsItems={settingsItems}
        pathname={pathname}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSignOut={() => signOut({ callbackUrl: "/auth/login" })}
        brandTitle={isAdmin ? "DentPro Admin" : "DentPro"}
        brandSubtitle={isAdmin ? "Administrator portal" : `${roleLabel || "Portal"} dashboard`}
      />
      <div className="flex min-h-screen flex-col md:pl-72">
        <Topbar
          roleLabel={roleLabel}
          userName={userName}
          onMenuClick={() => setIsSidebarOpen(true)}
          title={isAdmin ? "Administrator Portal" : undefined}
          subtitle={isAdmin ? "Dashboard Overview" : undefined}
          searchSlot={isAdmin ? <AdminGlobalSearch /> : undefined}
          notificationsSlot={isAdmin ? <NotificationsDropdown scope="admin" /> : undefined}
        />
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

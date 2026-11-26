"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

import {
  CalendarCheck,
  CreditCard,
  Gear,
  House,
  UserCircle,
  Users,
} from "@/components/ui/Icon";

import type { AuthSession } from "@/auth";
import { PortalGlassShell } from "@/app/portal/components/layout/PortalGlassShell";
import { GlobalSearch } from "@/app/portal/receptionist/components/GlobalSearch";
import { NotificationsBell } from "@/app/portal/receptionist/components/NotificationsBell";

interface ReceptionistShellProps {
  children: React.ReactNode;
  session: AuthSession;
}

const navItems = [
  { label: "Inicio", href: "/portal/receptionist/dashboard", icon: House },
  { label: "Agenda", href: "/portal/receptionist/schedule", icon: CalendarCheck },
  { label: "Pacientes", href: "/portal/receptionist/patients", icon: Users },
  { label: "Personal", href: "/portal/receptionist/staff", icon: UserCircle },
  { label: "Facturación", href: "/portal/receptionist/billing", icon: CreditCard },
];

const settingsItems = [{ label: "Configuración", href: "/portal/receptionist/settings", icon: Gear }];

export function ReceptionistShell({ children, session }: ReceptionistShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userName = session?.user?.name ?? "Recepción";

  return (
    <PortalGlassShell
      portalLabel="Portal recepción"
      homeHref="/portal/receptionist/dashboard"
      navItems={navItems}
      settingsItems={settingsItems}
      pathname={pathname}
      search={searchParams.toString()}
      userName={userName}
      onSignOut={() => signOut({ callbackUrl: "/auth/login" })}
      searchSlot={<GlobalSearch />}
      notificationsSlot={<NotificationsBell />}
    >
      {children}
    </PortalGlassShell>
  );
}

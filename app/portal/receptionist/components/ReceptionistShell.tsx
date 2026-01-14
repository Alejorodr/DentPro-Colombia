"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import {
  CalendarCheck,
  ClipboardText,
  Gear,
  House,
  UserCircle,
  Users,
} from "@phosphor-icons/react";

import type { AuthSession } from "@/auth";
import { roleLabels } from "@/lib/auth/roles";
import { Sidebar } from "@/app/portal/components/layout/Sidebar";
import { ReceptionistTopbar } from "@/app/portal/receptionist/components/ReceptionistTopbar";

interface ReceptionistShellProps {
  children: React.ReactNode;
  session: AuthSession;
}

const navItems = [
  { label: "Dashboard", href: "/portal/receptionist/dashboard", icon: House },
  { label: "Schedule", href: "/portal/receptionist/schedule", icon: CalendarCheck },
  { label: "Patients", href: "/portal/receptionist/patients", icon: Users },
  { label: "Staff", href: "/portal/receptionist/staff", icon: UserCircle },
  { label: "Billing", href: "/portal/receptionist/billing", icon: ClipboardText },
  { label: "Settings", href: "/portal/receptionist/settings", icon: Gear },
];

export function ReceptionistShell({ children, session }: ReceptionistShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userName = session?.user?.name ?? "Recepción";
  const userRoleLabel = roleLabels[session?.user?.role ?? "RECEPCIONISTA"];

  const activeLabel = useMemo(() => {
    const activeItem = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    return activeItem?.label ?? "Dashboard";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-surface-base dark:text-white">
      <Sidebar
        items={navItems}
        pathname={pathname}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSignOut={() => signOut({ callbackUrl: "/auth/login" })}
        brandSubtitle="Portal Recepcionista"
      />
      <div className="flex min-h-screen flex-col md:pl-72">
        <ReceptionistTopbar
          activeSection={activeLabel}
          userName={userName}
          userRole={userRoleLabel}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="w-full px-6 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

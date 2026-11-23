"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarPlus,
  Gear,
  House,
  UserCircle,
  ClockCounterClockwise,
  FileText,
} from "@/components/ui/Icon";

import type { AuthSession } from "@/auth";
import type { ClinicInfo } from "@/lib/clinic";
import { fetchWithTimeout } from "@/lib/http";
import { PortalGlassShell } from "@/app/portal/components/layout/PortalGlassShell";
import { Card } from "@/app/portal/components/ui/Card";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
import { NotificationsBell } from "@/app/portal/receptionist/components/NotificationsBell";

type PatientSummary = {
  name: string;
  patientCode?: string | null;
  avatarUrl?: string | null;
  id: string;
  needsOnboarding?: boolean;
};

type DashboardResponse = {
  patient: PatientSummary;
};

const navItems = [
  { label: "Inicio", href: "/portal/client", icon: House },
  { label: "Mis citas", href: "/portal/client/appointments", icon: CalendarCheck },
  { label: "Historial de tratamientos", href: "/portal/client/treatment-history", icon: ClockCounterClockwise },
  { label: "Consentimientos", href: "/portal/client/consents", icon: FileText },
  { label: "Mi perfil", href: "/portal/client/profile", icon: UserCircle },
];

const settingsItems = [{ label: "Configuración", href: "/portal/client/settings", icon: Gear }];

export function ClientPortalShell({
  children,
  session,
  clinic,
}: {
  children: React.ReactNode;
  session: AuthSession;
  clinic: ClinicInfo;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: patient = null } = useQuery<PatientSummary | null>({
    queryKey: ["client-dashboard"],
    queryFn: async () => {
      const res = await fetchWithTimeout("/api/client/dashboard");
      if (!res.ok) return null;
      const data = (await res.json()) as DashboardResponse | null;
      return data?.patient ?? null;
    },
  });

  const userName = useMemo(() => {
    if (patient?.name) {
      return patient.name;
    }
    return session?.user?.name ?? "Paciente";
  }, [patient?.name, session?.user?.name]);

  const patientCode = patient?.patientCode ?? (patient?.id ? patient.id.slice(0, 8) : "Sin ID");
  const avatarUrl = patient?.avatarUrl ?? session?.user?.image ?? null;

  return (
    <PortalGlassShell
      portalLabel="Portal paciente"
      homeHref="/portal/client"
      navItems={navItems}
      settingsItems={settingsItems}
      pathname={pathname}
      search={searchParams.toString()}
      userName={userName}
      onSignOut={() => signOut({ callbackUrl: "/auth/login" })}
      notificationsSlot={<NotificationsBell />}
      primaryAction={{ label: "Agendar cita", href: "/portal/client/book", icon: CalendarPlus }}
    >
      <div className="flex flex-col gap-6">
        {patient?.needsOnboarding && pathname !== "/portal/client/onboarding" ? (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800/50 dark:bg-amber-950/30">
            <p className="text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Bienvenido</span> Completa tu perfil para aprovechar todas las funciones del portal.
            </p>
            <Link
              href="/portal/client/onboarding"
              className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
            >
              Completar perfil
            </Link>
          </div>
        ) : null}
        {pathname === "/portal/client" ? (
          <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={userName} width={56} height={56} className="rounded-full object-cover" unoptimized />
              ) : (
                <AvatarFallback name={userName} className="h-14 w-14 text-base" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{userName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{patientCode}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
              <span className="rounded-full bg-brand-light/80 px-3 py-1 text-brand-teal dark:bg-surface-muted/60 dark:text-accent-cyan">
                {clinic.name}
              </span>
              {clinic.city ? <span className="px-2 py-1">{clinic.city}</span> : null}
            </div>
          </Card>
        ) : null}
        {children}
      </div>
    </PortalGlassShell>
  );
}

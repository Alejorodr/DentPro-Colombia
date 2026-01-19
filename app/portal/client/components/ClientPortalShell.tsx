"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarCheck,
  Gear,
  House,
  UserCircle,
  ClockCounterClockwise,
  FileText,
} from "@/components/ui/Icon";

import type { AuthSession } from "@/auth";
import type { ClinicInfo } from "@/lib/clinic";
import { fetchWithRetry } from "@/lib/http";
import { Sidebar } from "@/app/portal/components/layout/Sidebar";
import { Topbar } from "@/app/portal/components/layout/Topbar";
import { Card } from "@/app/portal/components/ui/Card";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
import { buttonClasses } from "@/components/ui/Button";

type PatientSummary = {
  name: string;
  patientCode?: string | null;
  avatarUrl?: string | null;
  id: string;
};

type DashboardResponse = {
  patient: PatientSummary;
};

const navItems = [
  { label: "Dashboard", href: "/portal/client", icon: House },
  { label: "Appointments", href: "/portal/client/appointments", icon: CalendarCheck },
  { label: "Treatment History", href: "/portal/client/treatment-history", icon: ClockCounterClockwise },
  { label: "Consents", href: "/portal/client/consents", icon: FileText },
  { label: "Profile", href: "/portal/client/profile", icon: UserCircle },
];

const settingsItems = [{ label: "Settings", href: "/portal/client/settings", icon: Gear }];

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
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchWithRetry("/api/client/dashboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DashboardResponse | null) => {
        if (!isMounted || !data?.patient) {
          return;
        }
        setPatient(data.patient);
      })
      .catch(() => {
        if (isMounted) {
          setPatient(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const userName = useMemo(() => {
    if (patient?.name) {
      return patient.name;
    }
    return session?.user?.name ?? "Paciente";
  }, [patient?.name, session?.user?.name]);

  const patientCode = patient?.patientCode ?? (patient?.id ? patient.id.slice(0, 8) : "Sin ID");
  const avatarUrl = patient?.avatarUrl ?? session?.user?.image ?? null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-surface-base dark:text-white">
      <Sidebar
        items={navItems}
        settingsItems={settingsItems}
        pathname={pathname}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSignOut={() => signOut({ callbackUrl: "/auth/login" })}
        brandTitle={clinic.name ?? "DentPro"}
        brandSubtitle="Portal paciente"
      />
      <div className="flex min-h-screen flex-col md:pl-72">
        <Topbar
          roleLabel="Paciente"
          userName={userName}
          onMenuClick={() => setIsSidebarOpen(true)}
          title="Portal Paciente"
          subtitle={clinic.city ?? "Panel de control"}
          extra={
            <Link
              href="/portal/client/book"
              className={buttonClasses({ variant: "primary", size: "sm" })}
              aria-label="Agendar una cita"
              title="Agendar una cita"
            >
              Agendar cita
            </Link>
          }
        />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={userName} className="h-14 w-14 rounded-full object-cover" />
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
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

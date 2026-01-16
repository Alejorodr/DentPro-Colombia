"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarCheck,
  ClipboardText,
  Gear,
  House,
  SignOut,
  UserCircle,
  ClockCounterClockwise,
} from "@/components/ui/Icon";

import type { AuthSession } from "@/auth";
import type { ClinicInfo } from "@/lib/clinic";

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
  { label: "Profile", href: "/portal/client/profile", icon: UserCircle },
  { label: "Settings", href: "/portal/client/settings", icon: Gear },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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

  useEffect(() => {
    let isMounted = true;

    fetch("/api/client/dashboard")
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
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-b border-slate-200 bg-white px-6 py-6 dark:border-surface-muted/70 dark:bg-surface-elevated lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-surface-muted/80 dark:text-accent-cyan">
              <ClipboardText size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-sm font-semibold">{clinic.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{clinic.city}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-surface-muted/70 dark:bg-surface-muted/30">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-surface-muted dark:text-accent-cyan">
                {getInitials(userName)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{patientCode}</p>
            </div>
          </div>

          <nav className="mt-6 flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-surface-muted dark:text-accent-cyan"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-surface-muted/60"
                  }`}
                >
                  <Icon size={18} weight={isActive ? "fill" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 space-y-4">
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 dark:border-surface-muted/70 dark:text-slate-200"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <SignOut size={16} className="mr-2" />
              Log Out
            </button>
            <Link
              href="/portal/client/book"
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Book Appointment
            </Link>
          </div>
        </aside>

        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

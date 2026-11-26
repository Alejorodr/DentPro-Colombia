"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";

import type { AuthSession } from "@/auth";
import type { ClinicInfo } from "@/lib/clinic";
import {
  CalendarBlank,
  FileText,
  Flask,
  Gear,
  House,
  Users,
} from "@/components/ui/Icon";
import { PortalGlassShell } from "@/app/portal/components/layout/PortalGlassShell";
import {
  PrivacyModeToggle,
  ProfessionalNotifications,
  ProfessionalSearch,
} from "@/app/portal/professional/components/ProfessionalTopbarControls";
import { ProfessionalPreferencesProvider } from "@/app/portal/professional/components/ProfessionalContext";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

interface ProfessionalShellProps {
  session: AuthSession;
  clinic: ClinicInfo;
  children: React.ReactNode;
}

const navItems = [
  { label: "Inicio", href: "/portal/professional", icon: House },
  { label: "Calendario", href: "/portal/professional/calendar", icon: CalendarBlank },
  { label: "Pacientes", href: "/portal/professional/patients", icon: Users },
  { label: "Resultados de laboratorio", href: "/portal/professional/lab-results", icon: Flask },
  { label: "Documentos", href: "/portal/professional/documents", icon: FileText },
];

const settingsItems = [{ label: "Configuración", href: "/portal/professional/settings", icon: Gear }];

export function ProfessionalShell({ session, children }: ProfessionalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userName = session?.user?.name ?? "Profesional";
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadPreferences = async () => {
      try {
        const response = await fetchWithRetry("/api/professional/preferences");
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { privacyMode: boolean };
        if (isMounted) {
          setPrivacyMode(Boolean(data.privacyMode));
        }
      } catch (error) {
        console.error(error);
      }
    };

    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, []);

  const updatePrivacyMode = async (value: boolean) => {
    setPrivacyMode(value);
    try {
      await fetchWithTimeout("/api/professional/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyMode: value }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ProfessionalPreferencesProvider privacyMode={privacyMode} setPrivacyMode={updatePrivacyMode}>
      <PortalGlassShell
        portalLabel="Portal profesional"
        homeHref="/portal/professional"
        navItems={navItems}
        settingsItems={settingsItems}
        pathname={pathname}
        search={searchParams.toString()}
        userName={userName}
        onSignOut={() => signOut({ callbackUrl: "/auth/login" })}
        searchSlot={<ProfessionalSearch />}
        notificationsSlot={<ProfessionalNotifications />}
        actionsSlot={<PrivacyModeToggle />}
      >
        {children}
      </PortalGlassShell>
    </ProfessionalPreferencesProvider>
  );
}

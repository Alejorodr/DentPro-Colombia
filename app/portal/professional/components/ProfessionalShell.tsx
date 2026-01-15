"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import type { AuthSession } from "@/auth";
import type { ClinicInfo } from "@/lib/clinic";
import { ProfessionalSidebar } from "@/app/portal/professional/components/ProfessionalSidebar";
import { ProfessionalTopbar } from "@/app/portal/professional/components/ProfessionalTopbar";
import { ProfessionalPreferencesProvider } from "@/app/portal/professional/components/ProfessionalContext";

interface ProfessionalShellProps {
  session: AuthSession;
  clinic: ClinicInfo;
  children: React.ReactNode;
}

export function ProfessionalShell({ session, clinic, children }: ProfessionalShellProps) {
  const pathname = usePathname();
  const userName = session?.user?.name ?? "Profesional";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== "undefined") {
      const storedTheme = window.localStorage.getItem("theme");
      if (!storedTheme) {
        document.documentElement.classList.add("dark");
        document.documentElement.dataset.theme = "dark";
      }
    }
    const loadPreferences = async () => {
      try {
        const response = await fetch("/api/professional/preferences");
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
      await fetch("/api/professional/preferences", {
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
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        <ProfessionalSidebar
          clinic={clinic}
          pathname={pathname}
          userName={userName}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex min-h-screen flex-col md:pl-72">
          <ProfessionalTopbar userName={userName} onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="flex-1 px-6 pb-10 pt-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
          </main>
        </div>
      </div>
    </ProfessionalPreferencesProvider>
  );
}

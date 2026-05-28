"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Bell, ShieldCheck } from "@/components/ui/Icon";
import { Card } from "@/app/portal/components/ui/Card";
import { Skeleton } from "@/app/portal/components/ui/Skeleton";
import { fetchWithRetry } from "@/lib/http";

type UserProfile = {
  id: string;
  name: string;
  lastName: string | null;
  email: string;
  role: string;
};

export function ReceptionistSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetchWithRetry("/api/users/me");
        if (response.ok) {
          const data = (await response.json()) as UserProfile;
          setProfile(data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const fullName = profile ? [profile.name, profile.lastName].filter(Boolean).join(" ") : null;
  const initials = fullName
    ? fullName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "R";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Settings</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Preferencias del portal</h1>
      </header>

      {/* Profile hero */}
      <Card>
        <div className="flex flex-wrap items-center gap-5">
          {isLoading ? (
            <Skeleton className="h-14 w-14 rounded-full" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-teal text-base font-bold text-white">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            {isLoading ? (
              <>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-1 h-3.5 w-52" />
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{fullName ?? "—"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.email ?? "—"}</p>
                <span className="mt-1 inline-block rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-teal dark:border-accent-cyan/30 dark:bg-accent-cyan/10 dark:text-accent-cyan">
                  {profile?.role ?? "RECEPCIONISTA"}
                </span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Two-column: Notifications + Security */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
              <Bell size={18} weight="bold" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Notificaciones</h2>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="text-slate-600 dark:text-slate-300">Cambios de estado de citas</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="text-slate-600 dark:text-slate-300">Nuevas citas y cancelaciones</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="text-slate-500 dark:text-slate-400">Recordatorios automáticos al paciente</span>
            </li>
          </ul>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Gestiona las notificaciones desde el centro de notificaciones en la barra superior.
          </p>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-indigo/10 text-brand-indigo dark:bg-brand-indigo/20 dark:text-brand-sky">
              <ShieldCheck size={18} weight="bold" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Acceso y seguridad</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="text-slate-600 dark:text-slate-300">Contraseña</span>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-semibold text-brand-teal transition hover:underline dark:text-accent-cyan"
              >
                Cambiar
              </Link>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="text-slate-600 dark:text-slate-300">Sesión activa</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-400">
                Activa
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="text-slate-600 dark:text-slate-300">Modo oscuro</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Barra superior</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

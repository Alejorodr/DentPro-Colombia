import Link from "next/link";

import { CheckCircle, Lock, Moon, UserCircle } from "@/components/ui/Icon";
import { requireRole } from "@/lib/auth/require-role";
import { Card } from "@/app/portal/components/ui/Card";

export default async function ClientSettingsPage() {
  const session = await requireRole("PACIENTE");
  const user = session?.user;
  const fullName = user?.name ?? "Paciente";
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() || "P";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Cuenta</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Preferencias</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gestiona tu información de cuenta y acceso al portal.
        </p>
      </header>

      {/* Account summary */}
      <Card>
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fullName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email ?? "—"}</p>
          </div>
          <Link
            href="/portal/client/profile"
            className="shrink-0 rounded-xl border border-brand-teal/40 px-3 py-1.5 text-xs font-semibold text-brand-teal transition hover:border-brand-teal hover:bg-brand-teal hover:text-white dark:border-accent-cyan/40 dark:text-accent-cyan dark:hover:border-accent-cyan dark:hover:bg-accent-cyan dark:hover:text-slate-900"
          >
            Editar perfil
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 dark:border-emerald-800/30 dark:bg-emerald-900/10">
          <CheckCircle size={15} weight="fill" className="shrink-0 text-emerald-500 dark:text-emerald-400" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">Cuenta activa y verificada</p>
        </div>
      </Card>

      {/* Security */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
            <Lock size={18} weight="bold" />
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Seguridad</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Contraseña de acceso</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Actualiza tu contraseña si la olvidaste o quieres cambiarla
            </p>
          </div>
          <Link
            href="/auth/forgot-password"
            className="shrink-0 rounded-xl border border-brand-teal px-4 py-2 text-xs font-semibold text-brand-teal transition hover:bg-brand-teal hover:text-white dark:border-accent-cyan dark:text-accent-cyan dark:hover:bg-accent-cyan dark:hover:text-slate-900"
          >
            Cambiar contraseña
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
          <div className="flex items-center gap-3">
            <UserCircle size={16} className="shrink-0 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">Perfil completo</span>
          </div>
          <Link
            href="/portal/client/profile"
            className="text-xs font-semibold text-brand-teal hover:underline dark:text-accent-cyan"
          >
            Ver perfil
          </Link>
        </div>
      </Card>

      {/* Appearance */}
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-indigo/10 text-brand-indigo dark:bg-brand-indigo/20 dark:text-brand-sky">
            <Moon size={18} weight="bold" />
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Apariencia</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Alterna entre modo claro y oscuro desde el ícono en la barra superior del portal.
        </p>
        <div className="rounded-xl border border-brand-indigo/20 bg-brand-indigo/5 px-4 py-3 text-xs text-brand-indigo dark:border-accent-cyan/20 dark:bg-accent-cyan/5 dark:text-accent-cyan">
          Tu preferencia de apariencia se guarda automáticamente en tu navegador.
        </div>
      </Card>
    </div>
  );
}

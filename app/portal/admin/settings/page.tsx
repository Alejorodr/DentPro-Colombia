import Link from "next/link";

import { CheckCircle, Gear, Lock, MapPin, UserCircle } from "@/components/ui/Icon";
import { requireRole } from "@/lib/auth/require-role";
import { getClinicInfo } from "@/lib/clinic";
import { Card } from "@/app/portal/components/ui/Card";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminSettingsPage() {
  const session = await requireRole("ADMINISTRADOR");
  const clinic = getClinicInfo();
  const user = session?.user;
  const fullName = user?.name ?? "Administrador";
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() || "A";
  const timezone = process.env.ANALYTICS_TIME_ZONE ?? "America/Bogota";

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Settings"
        title="Configuración general"
        description="Información del sistema, preferencias del portal y ajustes de seguridad."
      />

      {/* Clinic info — full width */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
            <MapPin size={18} weight="bold" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Clínica</p>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{clinic.name}</h2>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-surface-muted/40 dark:bg-surface-muted/20">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ciudad</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{clinic.city}</dd>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-surface-muted/40 dark:bg-surface-muted/20">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dirección</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{clinic.address}</dd>
          </div>
        </dl>
        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500">
          Configura estos valores con las variables de entorno{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-surface-muted/60">CLINIC_NAME</code>,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-surface-muted/60">CLINIC_CITY</code> y{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-surface-muted/60">CLINIC_ADDRESS</code>.
        </p>
      </Card>

      {/* Two-column: Account + Portal */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan">
              <UserCircle size={18} weight="bold" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Tu cuenta</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fullName}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email ?? "—"}</p>
              <span className="mt-1.5 inline-block rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-teal dark:border-accent-cyan/30 dark:bg-accent-cyan/10 dark:text-accent-cyan">
                {(user as { role?: string })?.role ?? "ADMINISTRADOR"}
              </span>
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-indigo/10 text-brand-indigo dark:bg-brand-indigo/20 dark:text-brand-sky">
              <Gear size={18} weight="bold" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Portal</h2>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="text-slate-600 dark:text-slate-300">Zona horaria</span>
              <span className="font-medium text-slate-900 dark:text-white">{timezone}</span>
            </li>
            <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="text-slate-600 dark:text-slate-300">Idioma</span>
              <span className="font-medium text-slate-900 dark:text-white">Español (Colombia)</span>
            </li>
            <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
              <span className="text-slate-600 dark:text-slate-300">Modo oscuro</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Barra superior</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Security — full width */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400">
            <Lock size={18} weight="bold" />
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Seguridad</h2>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Contraseña de acceso</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cambia tu contraseña de administrador</p>
            </div>
            <Link
              href="/auth/forgot-password"
              className="shrink-0 rounded-xl border border-brand-teal px-4 py-2 text-xs font-semibold text-brand-teal transition hover:bg-brand-teal hover:text-white dark:border-accent-cyan dark:text-accent-cyan dark:hover:bg-accent-cyan dark:hover:text-slate-900"
            >
              Cambiar contraseña
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-surface-muted/40">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Correo electrónico</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email ?? "—"}</p>
            </div>
            <CheckCircle size={18} weight="fill" className="shrink-0 text-emerald-500 dark:text-emerald-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}

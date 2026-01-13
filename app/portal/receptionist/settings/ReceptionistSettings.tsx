"use client";

import { Card } from "@/app/portal/components/ui/Card";

export function ReceptionistSettings() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Settings</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Preferencias del portal</h1>
      </section>
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cuenta</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferencias rápidas</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Gestiona tu disponibilidad, notificaciones y accesos desde este panel. El modo claro/oscuro se controla desde
          la barra superior.
        </p>
        <ul className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="rounded-xl border border-slate-100 px-3 py-2 dark:border-surface-muted">
            Notificaciones activas para cambios de estado y nuevas citas.
          </li>
          <li className="rounded-xl border border-slate-100 px-3 py-2 dark:border-surface-muted">
            Roles protegidos según tu sesión actual.
          </li>
        </ul>
      </Card>
    </div>
  );
}

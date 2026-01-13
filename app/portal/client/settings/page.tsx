import { requireRole } from "@/lib/auth/require-role";

export default async function ClientSettingsPage() {
  await requireRole("PACIENTE");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-600">Settings</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Preferencias</h1>
      </header>
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-surface-muted/60 dark:text-slate-300">
        Estamos preparando nuevas opciones de configuración para tu perfil.
      </div>
    </div>
  );
}

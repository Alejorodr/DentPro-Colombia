import { requireRole } from "@/lib/auth/require-role";
import { Card } from "@/app/portal/components/ui/Card";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminSettingsPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Settings"
        title="Configuración general"
        description="Ajustes clave para el portal administrativo y las preferencias del equipo."
      />
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferencias del portal</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          En esta sección podrás configurar notificaciones, permisos y flujos internos.
        </p>
      </Card>
    </div>
  );
}

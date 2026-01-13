import { requireRole } from "@/lib/auth/require-role";
import { Card } from "@/app/portal/components/ui/Card";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminContentPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="CMS"
        title="Contenido del sitio"
        description="Configura banners, promociones y textos clave para el portal de marketing."
      />
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Próximamente</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Estamos preparando un módulo para que el equipo admin gestione contenidos sin depender del equipo técnico.
        </p>
      </Card>
    </div>
  );
}

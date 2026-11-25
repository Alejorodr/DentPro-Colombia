import { requireRole } from "@/lib/auth/require-role";
import { CupsCatalogPanel } from "@/app/portal/admin/cups/CupsCatalogPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminCupsPage() {
  await requireRole("ADMINISTRADOR");
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Catálogo CUPS"
        title="Procedimientos que presta la clínica"
        description="Marca los procedimientos CUPS que se hacen en la clínica, el servicio con el que se agenda cada uno y quién lo realiza."
      />
      <CupsCatalogPanel />
    </div>
  );
}

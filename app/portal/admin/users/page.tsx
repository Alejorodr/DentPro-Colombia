import { requireRole } from "@/lib/auth/require-role";
import { AdminUsersPanel } from "@/app/portal/admin/users/AdminUsersPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminUsersPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Usuarios"
        title="Gestión de usuarios"
        description="Crea cuentas y asigna roles desde un solo panel."
      />
      <AdminUsersPanel />
    </div>
  );
}

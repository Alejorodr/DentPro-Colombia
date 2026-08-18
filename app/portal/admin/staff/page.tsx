import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { AdminProfessionalsPanel } from "@/app/portal/admin/professionals/AdminProfessionalsPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";

export default async function AdminStaffPage() {
  await requireRole("ADMINISTRADOR");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Staff Management"
        title="Equipo clínico"
        description="Administra profesionales, disponibilidad y perfiles en un solo lugar."
      />
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Mostrando solo profesionales.{" "}
        <Link href="/portal/admin/users" className="font-semibold text-brand-teal hover:underline dark:text-accent-cyan">
          Ver todos los usuarios
        </Link>
      </p>
      <AdminProfessionalsPanel />
    </div>
  );
}

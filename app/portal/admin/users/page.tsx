import { requireRole } from "@/lib/auth/require-role";
import { AdminUsersPanel } from "@/app/portal/admin/users/AdminUsersPanel";
import { SectionHeader } from "@/app/portal/components/ui/SectionHeader";
import { isUserRole } from "@/lib/auth/roles";

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({
  searchParams = Promise.resolve({}),
}: AdminUsersPageProps) {
  await requireRole("ADMINISTRADOR");

  const resolvedSearchParams = await searchParams;
  const roleParam = resolvedSearchParams?.role;
  const roleValue = typeof roleParam === "string" ? roleParam : undefined;
  const roleFilter = roleValue && isUserRole(roleValue) ? roleValue : undefined;

  // `lock=1` is only set by redirects from the old dedicated pages (e.g. /portal/admin/staff)
  // to reproduce their old locked-role create form. The plain Users page never sets it, so its
  // create form keeps the full role <select>.
  const lockParam = resolvedSearchParams?.lock;
  const lockValue = typeof lockParam === "string" ? lockParam : undefined;
  const roleLock = lockValue === "1" && roleFilter ? roleFilter : undefined;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Usuarios"
        title="Gestión de usuarios"
        description="Crea cuentas y asigna roles desde un solo panel."
      />
      <AdminUsersPanel roleFilter={roleFilter} roleLock={roleLock} />
    </div>
  );
}

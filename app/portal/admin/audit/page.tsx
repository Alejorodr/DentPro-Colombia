import { requireRole } from "@/lib/auth/require-role";

import { AdminAuditPanel } from "@/app/portal/admin/audit/panel";

export default async function AdminAuditPage() {
  await requireRole("ADMINISTRADOR");
  return <AdminAuditPanel />;
}

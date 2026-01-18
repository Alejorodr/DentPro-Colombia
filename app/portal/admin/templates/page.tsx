import { requireRole } from "@/lib/auth/require-role";

import { AdminTemplatesPanel } from "@/app/portal/admin/templates/templates-panel";

export default async function AdminTemplatesPage() {
  await requireRole("ADMINISTRADOR");
  return <AdminTemplatesPanel />;
}

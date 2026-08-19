import { requireRole } from "@/lib/auth/require-role";
import { ContentShell } from "@/app/portal/admin/content/ContentShell";

export default async function AdminContentPage() {
  await requireRole("ADMINISTRADOR");

  return <ContentShell />;
}

import { requireRole } from "@/lib/auth/require-role";
import { AdminSearchResults } from "@/app/portal/admin/search/AdminSearchResults";

export default async function AdminSearchPage() {
  await requireRole("ADMINISTRADOR");
  return <AdminSearchResults />;
}

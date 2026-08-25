import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";

export default async function AdminProfessionalsPage() {
  await requireRole("ADMINISTRADOR");
  // Straight to the final destination — /portal/admin/staff is itself only a redirect here.
  redirect("/portal/admin/users?role=PROFESIONAL&lock=1");
}

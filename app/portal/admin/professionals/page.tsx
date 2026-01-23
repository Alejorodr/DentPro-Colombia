import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";

export default async function AdminProfessionalsPage() {
  await requireRole("ADMINISTRADOR");
  redirect("/portal/admin/staff");
}

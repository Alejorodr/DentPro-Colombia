import { AdminUsersPanel } from "@/app/portal/admin/users/AdminUsersPanel";

export function AdminProfessionalsPanel() {
  return <AdminUsersPanel roleFilter="PROFESIONAL" roleLock="PROFESIONAL" />;
}

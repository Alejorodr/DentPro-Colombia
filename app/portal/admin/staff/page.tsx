import { redirect } from "next/navigation";

export default function AdminStaffPage() {
  redirect("/portal/admin/users?role=PROFESIONAL&lock=1");
}

import { redirect } from "next/navigation";

export default function AdminPatientsPage() {
  redirect("/portal/admin/users?role=PACIENTE&lock=1");
}

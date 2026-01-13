import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistStaff } from "@/app/portal/receptionist/staff/ReceptionistStaff";

export default async function ReceptionistStaffPage() {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistStaff />;
}

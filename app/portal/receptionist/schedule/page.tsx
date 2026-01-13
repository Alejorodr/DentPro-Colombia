import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistSchedule } from "@/app/portal/receptionist/schedule/ReceptionistSchedule";

export default async function ReceptionistSchedulePage() {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistSchedule />;
}

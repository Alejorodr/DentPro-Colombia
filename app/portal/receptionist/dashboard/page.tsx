import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistDashboard } from "@/app/portal/receptionist/dashboard/ReceptionistDashboard";

export default async function ReceptionistDashboardPage() {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistDashboard />;
}

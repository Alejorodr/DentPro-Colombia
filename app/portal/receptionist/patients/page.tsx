import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistPatients } from "@/app/portal/receptionist/patients/ReceptionistPatients";

export default async function ReceptionistPatientsPage() {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistPatients />;
}

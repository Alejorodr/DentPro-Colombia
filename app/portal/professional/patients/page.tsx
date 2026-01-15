import { requireRole } from "@/lib/auth/require-role";
import { ProfessionalPatients } from "@/app/portal/professional/patients/ProfessionalPatients";

export default async function ProfessionalPatientsPage() {
  await requireRole("PROFESIONAL");

  return <ProfessionalPatients />;
}

import { requireRole } from "@/lib/auth/require-role";
import { ProfessionalLabResults } from "@/app/portal/professional/lab-results/ProfessionalLabResults";

export default async function ProfessionalLabResultsPage() {
  await requireRole("PROFESIONAL");

  return <ProfessionalLabResults />;
}

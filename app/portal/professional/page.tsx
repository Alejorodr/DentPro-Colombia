import { requireRole } from "@/lib/auth/require-role";
import { ProfessionalDashboard } from "@/app/portal/professional/ProfessionalDashboard";

export default async function ProfessionalPortalPage() {
  await requireRole("PROFESIONAL");

  return <ProfessionalDashboard />;
}

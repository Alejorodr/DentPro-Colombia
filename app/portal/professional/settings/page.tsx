import { requireRole } from "@/lib/auth/require-role";
import { ProfessionalSettings } from "@/app/portal/professional/settings/ProfessionalSettings";

export default async function ProfessionalSettingsPage() {
  await requireRole("PROFESIONAL");

  return <ProfessionalSettings />;
}

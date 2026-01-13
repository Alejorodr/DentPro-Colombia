import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistSettings } from "@/app/portal/receptionist/settings/ReceptionistSettings";

export default async function ReceptionistSettingsPage() {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistSettings />;
}

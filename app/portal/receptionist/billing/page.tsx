import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistBilling } from "@/app/portal/receptionist/billing/ReceptionistBilling";

export default async function ReceptionistBillingPage() {
  await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistBilling />;
}

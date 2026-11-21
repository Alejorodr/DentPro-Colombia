import { requireRole } from "@/lib/auth/require-role";
import { ReceptionistBilling } from "@/app/portal/receptionist/billing/ReceptionistBilling";

export default async function ReceptionistBillingPage() {
  const session = await requireRole(["RECEPCIONISTA", "ADMINISTRADOR"]);
  return <ReceptionistBilling isAdmin={session?.user?.role === "ADMINISTRADOR"} />;
}

import { requireRole } from "@/lib/auth/require-role";

import { ClientConsentsPanel } from "@/app/portal/client/consents/panel";

export default async function ClientConsentsPage() {
  await requireRole("PACIENTE");
  return <ClientConsentsPanel />;
}

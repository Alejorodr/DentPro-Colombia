import type { ReactNode } from "react";

import { auth } from "@/auth";
import { PortalShell } from "@/app/portal/components/PortalShell";
import { getClinicInfo } from "@/lib/clinic";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const clinic = getClinicInfo();
  return (
    <PortalShell session={session} clinic={clinic}>
      {children}
    </PortalShell>
  );
}

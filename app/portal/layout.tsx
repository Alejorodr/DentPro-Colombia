import type { ReactNode } from "react";

import { auth } from "@/auth";
import { PortalShell } from "@/app/portal/components/PortalShell";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return <PortalShell session={session}>{children}</PortalShell>;
}

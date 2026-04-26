import type { ReactNode } from "react";
import type { Metadata } from "next";

import { auth } from "@/auth";
import { PortalShell } from "@/app/portal/components/PortalShell";
import { getClinicInfo } from "@/lib/clinic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const clinic = getClinicInfo();
  return (
    <PortalShell session={session} clinic={clinic}>
      {children}
    </PortalShell>
  );
}

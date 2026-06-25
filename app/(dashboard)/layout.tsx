import type { ReactNode } from "react";

import { auth } from "@/auth";

import { DashboardShell } from "./components/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return <DashboardShell session={session}>{children}</DashboardShell>;
}


"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";

import type { UserRole } from "@/lib/auth/roles";

export function useAuthRole() {
  const { data: session, status } = useSession();
  const userRole = ((session?.user ?? null) as { role?: UserRole } | null)?.role ?? null;

  return useMemo(
    () => ({
      role: userRole,
      isLoading: status === "loading",
    }),
    [userRole, status],
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 30,
          gcTime: 1000 * 60 * 5,
          refetchOnWindowFocus: false,
        },
      },
    }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}


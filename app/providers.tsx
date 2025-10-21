"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";

import type { UserRole } from "@/lib/auth/roles";

interface RoleContextValue {
  role: UserRole | null;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function RoleProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userRole = ((session?.user ?? null) as { role?: UserRole } | null)?.role ?? null;
  const value = useMemo<RoleContextValue>(
    () => ({
      role: userRole,
      isLoading: status === "loading",
    }),
    [userRole, status],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useAuthRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useAuthRole debe usarse dentro de RoleProvider");
  }
  return context;
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
        <RoleProvider>{children}</RoleProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}


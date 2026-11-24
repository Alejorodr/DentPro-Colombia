"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

import PwaRegister from "@/components/PwaRegister";

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
        <PwaRegister />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}

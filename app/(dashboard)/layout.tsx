import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 py-12 transition-colors duration-300 dark:bg-surface-base">
      <div className="container mx-auto max-w-5xl px-6">{children}</div>
    </div>
  );
}

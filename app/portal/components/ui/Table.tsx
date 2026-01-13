import type { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200/80 dark:border-surface-muted/80 ${className ?? ""}`}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

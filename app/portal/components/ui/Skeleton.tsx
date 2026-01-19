import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-slate-200/80 dark:bg-surface-muted/70", className)}
      {...props}
    />
  );
}

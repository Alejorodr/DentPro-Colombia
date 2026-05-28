"use client";

import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";

interface FloatingAction {
  href: string;
  label: string;
  icon: MarketingIconName;
  className?: string;
  external?: boolean;
}

interface FloatingActionsProps {
  actions: FloatingAction[];
}

export function FloatingActions({ actions }: FloatingActionsProps) {
  return (
    <div className="floating-actions" role="region" aria-label="Accesos rápidos">
      {actions.map((action) => {
        const ActionIcon = resolveMarketingIcon(action.icon);

        return (
          <a
            key={action.href}
            href={action.href}
            className={`group relative floating-action-btn ${action.className ?? ""}`.trim()}
            aria-label={action.label}
            target={action.external ? "_blank" : undefined}
            rel={action.external ? "noopener noreferrer" : undefined}
          >
            <ActionIcon className="h-6 w-6" weight="bold" aria-hidden="true" />
            <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-surface-elevated/95 dark:text-slate-100">
              {action.label}
            </span>
          </a>
        );
      })}
    </div>
  );
}


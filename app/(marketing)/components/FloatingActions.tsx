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
            className={`floating-action-btn ${action.className ?? ""}`.trim()}
            aria-label={action.label}
            target={action.external ? "_blank" : undefined}
            rel={action.external ? "noopener noreferrer" : undefined}
          >
            <ActionIcon className="h-6 w-6" weight="bold" aria-hidden="true" />
            <span className="sr-only">{action.label}</span>
          </a>
        );
      })}
    </div>
  );
}


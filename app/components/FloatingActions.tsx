interface FloatingAction {
  href: string;
  label: string;
  icon: string;
  className?: string;
  external?: boolean;
}

interface FloatingActionsProps {
  actions: FloatingAction[];
}

export function FloatingActions({ actions }: FloatingActionsProps) {
  return (
    <div className="floating-actions" role="region" aria-label="Accesos r├ípidos">
      {actions.map((action) => (
        <a
          key={action.href}
          href={action.href}
          className={`floating-action-btn ${action.className ?? ""}`.trim()}
          aria-label={action.label}
          target={action.external ? "_blank" : undefined}
          rel={action.external ? "noopener noreferrer" : undefined}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            {action.icon}
          </span>
          <span className="sr-only">{action.label}</span>
        </a>
      ))}
    </div>
  );
}


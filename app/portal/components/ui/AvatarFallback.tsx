interface AvatarFallbackProps {
  name: string;
  className?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export function AvatarFallback({ name, className }: AvatarFallbackProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-brand-teal/10 text-sm font-semibold text-brand-teal dark:bg-accent-cyan/15 dark:text-accent-cyan ${
        className ?? ""
      }`}
    >
      <span aria-hidden="true">{initials}</span>
      <span className="sr-only">Avatar de {name}</span>
    </div>
  );
}

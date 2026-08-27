"use client";

import Image from "next/image";
import Link from "next/link";

import { useRef } from "react";

import { SignOut, X } from "@/components/ui/Icon";
import type { Icon, IconHandle } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

const iconWeight = "bold" as const;

type NavItem = {
  label: string;
  href: string;
  icon: Icon;
};

interface SidebarProps {
  items: NavItem[];
  settingsItems?: NavItem[];
  pathname: string;
  /** Current query string (without `?`). Needed by entries whose href carries filters. */
  search?: string;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  brandTitle?: string;
  brandSubtitle?: string;
}

function isItemActive(pathname: string, search: string, href: string) {
  const [hrefPath, hrefQuery] = href.split("?");

  if (hrefQuery) {
    // Query-scoped entry (e.g. the unified Users page pre-filtered by role): active only when
    // the current URL carries every param the entry declares.
    if (pathname !== hrefPath) {
      return false;
    }
    const current = new URLSearchParams(search);
    return Array.from(new URLSearchParams(hrefQuery)).every(([key, value]) => current.get(key) === value);
  }

  if (hrefPath === "/portal/admin") {
    return pathname === hrefPath;
  }

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

/**
 * Resolves the single most specific matching entry, so a plain href does not stay lit while a
 * query-scoped sibling owns the current URL (e.g. "Usuarios" vs "Gestión de personal").
 */
function resolveActiveHref(pathname: string, search: string, entries: NavItem[]): string | null {
  return (
    entries
      .filter((entry) => isItemActive(pathname, search, entry.href))
      .sort((a, b) => b.href.length - a.href.length)
      .at(0)?.href ?? null
  );
}

function SidebarNavLink({ active, item }: { active: boolean; item: NavItem }) {
  const iconRef = useRef<IconHandle>(null);
  const ItemIcon = item.icon;

  const startIconAnimation = () => iconRef.current?.startAnimation();
  const stopIconAnimation = () => iconRef.current?.stopAnimation();

  return (
    <Link
      key={item.href}
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:focus-visible:ring-accent-cyan/60 ${
        active
          ? "bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-muted/70"
      }`}
      onBlur={stopIconAnimation}
      onFocus={startIconAnimation}
      onMouseEnter={startIconAnimation}
      onMouseLeave={stopIconAnimation}
      onPointerDown={startIconAnimation}
    >
      <ItemIcon
        ref={iconRef}
        aria-hidden="true"
        className="h-5 w-5"
        isAnimated={false}
        nativeAnimation
        weight={iconWeight}
      />
      {item.label}
    </Link>
  );
}

export function Sidebar({
  items,
  settingsItems = [],
  pathname,
  search = "",
  isOpen,
  onClose,
  onSignOut,
  brandTitle = "DentPro",
  brandSubtitle = "Admin portal",
}: SidebarProps) {
  const activeHref = resolveActiveHref(pathname, search, [...items, ...settingsItems]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white/95 shadow-lg shadow-slate-200/30 transition-transform duration-300 dark:border-surface-muted/80 dark:bg-surface-base md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-glow overflow-hidden">
              <Image src="/icon.svg" alt="" aria-hidden="true" width={40} height={40} className="h-10 w-10" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{brandTitle}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{brandSubtitle}</p>
            </div>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/50 dark:border-surface-muted dark:text-slate-300 md:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
            title="Cerrar menú"
          >
            <X aria-hidden="true" size={18} weight="bold" />
          </button>
        </div>
        <nav className="flex-1 space-y-4 px-4">
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Navegación
            </p>
            {items.map((item) => {
              const active = item.href === activeHref;
              return <SidebarNavLink key={item.href} active={active} item={item} />;
            })}
          </div>
          {settingsItems.length > 0 ? (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Ajustes
              </p>
              {settingsItems.map((item) => {
                const active = item.href === activeHref;
                return <SidebarNavLink key={item.href} active={active} item={item} />;
              })}
            </div>
          ) : null}
        </nav>
        <div className="border-t border-slate-200 px-4 py-4 dark:border-surface-muted/70">
          <Button
            type="button"
            variant="ghost"
            onClick={onSignOut}
            className="w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm font-medium"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <SignOut aria-hidden="true" className="h-5 w-5" weight="bold" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  );
}

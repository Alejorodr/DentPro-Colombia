"use client";

import Link from "next/link";

import type { ComponentType, SVGProps } from "react";

import { SignOut, X } from "@phosphor-icons/react";

const iconWeight = "bold" as const;

type IconProps = SVGProps<SVGSVGElement> & { weight?: typeof iconWeight };

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
};

interface SidebarProps {
  items: NavItem[];
  settingsItems?: NavItem[];
  pathname: string;
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  brandTitle?: string;
  brandSubtitle?: string;
}

function isItemActive(pathname: string, href: string) {
  if (href === "/portal/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  items,
  settingsItems = [],
  pathname,
  isOpen,
  onClose,
  onSignOut,
  brandTitle = "DentPro",
  brandSubtitle = "Admin portal",
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity md:hidden ${
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-white shadow-glow">
              DP
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{brandTitle}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{brandSubtitle}</p>
            </div>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50 dark:border-surface-muted dark:text-slate-300 md:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
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
              const active = isItemActive(pathname, item.href);
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:focus-visible:ring-accent-cyan/60 ${
                    active
                      ? "bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-muted/70"
                  }`}
                >
                  <ItemIcon aria-hidden="true" className="h-5 w-5" weight={iconWeight} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {settingsItems.length > 0 ? (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Ajustes
              </p>
              {settingsItems.map((item) => {
                const active = isItemActive(pathname, item.href);
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:focus-visible:ring-accent-cyan/60 ${
                      active
                        ? "bg-brand-teal/10 text-brand-teal dark:bg-accent-cyan/10 dark:text-accent-cyan"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-surface-muted/70"
                    }`}
                  >
                    <ItemIcon aria-hidden="true" className="h-5 w-5" weight={iconWeight} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>
        <div className="border-t border-slate-200 px-4 py-4 dark:border-surface-muted/70">
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:text-slate-300 dark:hover:bg-surface-muted/70"
          >
            <SignOut aria-hidden="true" className="h-5 w-5" weight="bold" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

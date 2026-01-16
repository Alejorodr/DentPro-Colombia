"use client";

import type { ReactNode } from "react";

import { Bell, List, Question } from "@/components/ui/Icon";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";

interface TopbarProps {
  roleLabel?: string;
  userName: string;
  onMenuClick: () => void;
  extra?: ReactNode;
  title?: string;
  subtitle?: string;
  searchSlot?: ReactNode;
  notificationsSlot?: ReactNode;
}

export function Topbar({
  roleLabel,
  userName,
  onMenuClick,
  extra,
  title,
  subtitle,
  searchSlot,
  notificationsSlot,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-sm dark:border-surface-muted dark:bg-surface-elevated/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-300 md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <List aria-hidden="true" size={20} weight="bold" />
        </button>
        <div>
          {roleLabel ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">{roleLabel}</p>
          ) : null}
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title ?? "Portal"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{subtitle ?? "Panel de control"}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="flex w-full max-w-xs items-center md:flex">
          {searchSlot ?? (
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Buscar en el portal"
                aria-label="Buscar"
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-xs shadow-slate-100/50 outline-hidden transition focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
              />
            </div>
          )}
        </div>
        {extra}
        <ThemeToggle />
        {notificationsSlot ?? (
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-200"
            aria-label="Ver notificaciones"
          >
            <Bell aria-hidden="true" className="h-5 w-5" weight="bold" />
          </button>
        )}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-200"
          aria-label="Ayuda"
        >
          <Question aria-hidden="true" className="h-5 w-5" weight="bold" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-sm text-slate-600 shadow-xs shadow-slate-100/40 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200">
          <AvatarFallback name={userName} className="h-9 w-9" />
          <span className="hidden pr-2 text-xs font-medium md:inline">{userName}</span>
        </div>
      </div>
    </header>
  );
}

"use client";

import { List } from "@phosphor-icons/react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";
import { GlobalSearch } from "@/app/portal/receptionist/components/GlobalSearch";
import { NotificationsBell } from "@/app/portal/receptionist/components/NotificationsBell";

interface ReceptionistTopbarProps {
  activeSection: string;
  userName: string;
  userRole: string;
  onMenuClick: () => void;
}

export function ReceptionistTopbar({ activeSection, userName, userRole, onMenuClick }: ReceptionistTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-surface-muted dark:bg-surface-elevated/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-300 md:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <List aria-hidden="true" size={20} weight="bold" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Recepcionista</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{activeSection}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="relative hidden w-full max-w-md items-center md:flex">
          <GlobalSearch />
        </div>
        <ThemeToggle />
        <NotificationsBell />
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-sm text-slate-600 shadow-sm shadow-slate-100/40 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200">
          <AvatarFallback name={userName} className="h-9 w-9" />
          <div className="hidden pr-2 text-xs md:block">
            <p className="font-semibold">{userName}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

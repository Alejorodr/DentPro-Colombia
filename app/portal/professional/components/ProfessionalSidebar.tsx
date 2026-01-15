"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  CalendarBlank,
  FileText,
  Flask,
  Gear,
  House,
  Users,
  XCircle,
} from "@phosphor-icons/react";

import type { ClinicInfo } from "@/lib/clinic";
import { cn } from "@/lib/utils";

interface ProfessionalSidebarProps {
  clinic: ClinicInfo;
  pathname: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/portal/professional", icon: House },
  { label: "Calendar", href: "/portal/professional/calendar", icon: CalendarBlank },
  { label: "Patients", href: "/portal/professional/patients", icon: Users },
  { label: "Lab Results", href: "/portal/professional/lab-results", icon: Flask },
  { label: "Documents", href: "/portal/professional/documents", icon: FileText },
  { label: "Settings", href: "/portal/professional/settings", icon: Gear },
];

export function ProfessionalSidebar({ clinic, pathname, userName, isOpen, onClose }: ProfessionalSidebarProps) {
  const clinicName = clinic.name ?? "DentPro";
  const isActive = useMemo(() => new Set([pathname, pathname.replace(/\/$/, "")]), [pathname]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white/95 px-5 py-6 text-slate-900 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-white",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        "transition-transform",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-indigo text-white">DP</div>
          <div>
            <p className="text-sm font-semibold">{userName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{clinicName}</p>
          </div>
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-200 md:hidden"
          aria-label="Cerrar menú"
          onClick={onClose}
        >
          <XCircle size={24} />
        </button>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = isActive.has(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/30"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900",
              )}
            >
              <Icon size={20} weight={active ? "fill" : "regular"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-semibold">System Online</span>
        </div>
        <p className="mt-1 text-[11px]">Última sincronización hace 2 min.</p>
      </div>
    </aside>
  );
}

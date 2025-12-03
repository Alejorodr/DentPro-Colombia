"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo } from "react";

import { isUserRole, roleLabels, type UserRole } from "@/lib/auth/roles";
import type { Session } from "next-auth";

interface DashboardShellProps {
  children: React.ReactNode;
  session: Session | null;
}

interface NavItem {
  label: string;
  href: string;
}

function getActiveRole(pathname: string, fallbackRole: UserRole): UserRole {
  const [, maybeRole] = pathname.split("/").filter(Boolean);

  if (maybeRole && isUserRole(maybeRole)) {
    return maybeRole;
  }

  if (isUserRole(fallbackRole)) {
    return fallbackRole;
  }

  return "reception";
}

function getNavItems(role: UserRole): NavItem[] {
  return [
    { label: "Citas", href: `/${role}/appointments` },
    { label: "Pacientes", href: `/${role}/patients` },
    { label: "Horarios", href: `/${role}/schedules` },
  ];
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-100">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center justify-between rounded-xl px-3 py-2 transition-colors ${
                isActive
                  ? "bg-brand-teal/10 text-brand-teal ring-1 ring-brand-teal/30 dark:bg-accent-cyan/10 dark:text-accent-cyan"
                  : "hover:bg-slate-100 dark:hover:bg-surface-muted"
              }`}
            >
              <span className="truncate">{item.label}</span>
              <span
                aria-hidden
                className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200 dark:bg-surface-elevated dark:text-slate-300 dark:ring-surface-muted"
              >
                Go
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardShell({ children, session }: DashboardShellProps) {
  const pathname = usePathname();
  const role = getActiveRole(pathname, (session?.user?.role as UserRole | undefined) ?? "reception");
  const navItems = useMemo(() => getNavItems(role), [role]);
  const userName = session?.user?.name ?? "Usuario";
  const roleLabel = roleLabels[role] ?? role;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-surface-base dark:text-slate-50">
      <div className="grid min-h-screen gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-slate-200 lg:bg-white lg:px-6 lg:py-8 lg:shadow-sm dark:lg:border-surface-muted dark:lg:bg-surface-elevated">
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-indigo">DentPro</p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tablero</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">Navega entre tus módulos principales.</p>
            </div>
            <NavLinks items={navItems} pathname={pathname} />
          </div>
          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-surface-muted dark:text-slate-200 dark:ring-surface-muted">
            <p className="font-semibold">Consejo rápido</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Confirma las citas pendientes para evitar choques de horario.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur transition-colors duration-300 dark:border-surface-muted dark:bg-surface-elevated/80">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">{roleLabel}</p>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">{userName}</span>
                  <span className="text-slate-400">•</span>
                  <span>Sesión activa</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <nav className="hidden items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-surface-muted dark:text-slate-100 dark:ring-surface-muted lg:flex">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-full px-3 py-1 transition-colors ${
                          isActive
                            ? "bg-white text-brand-indigo shadow-sm ring-1 ring-brand-indigo/40 dark:bg-surface-base dark:text-accent-cyan"
                            : "hover:bg-white/80 dark:hover:bg-surface-base"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="btn-secondary btn-sm"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
            <div className="block border-t border-slate-100 bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/60 dark:border-surface-muted dark:bg-surface-elevated dark:text-slate-100 lg:hidden">
              <div className="flex items-center justify-between">
                <span>Accesos rápidos</span>
                <div className="flex items-center gap-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-full px-2 py-1 transition-colors ${
                          isActive ? "bg-brand-teal/10 text-brand-teal" : "hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Bell,
  List,
  MagnifyingGlass,
  MoonStars,
  ShieldCheck,
} from "@phosphor-icons/react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useProfessionalPreferences } from "@/app/portal/professional/components/ProfessionalContext";

interface ProfessionalTopbarProps {
  userName: string;
  onMenuClick: () => void;
}

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  href: string;
  type: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
}

export function ProfessionalTopbar({ userName, onMenuClick }: ProfessionalTopbarProps) {
  const router = useRouter();
  const { privacyMode, setPrivacyMode } = useProfessionalPreferences();
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/professional/notifications");
        if (!response.ok) return;
        const data = (await response.json()) as { notifications: NotificationItem[] };
        if (active) {
          setNotifications(data.notifications ?? []);
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&scope=professional`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error(error);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-slate-800 dark:text-slate-200 md:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <List aria-hidden="true" size={20} weight="bold" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Portal Dashboard</p>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {greeting}, {userName}
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-end gap-3">
        <div className="relative hidden w-full max-w-sm items-center md:flex">
          <MagnifyingGlass className="absolute left-4 text-slate-400" size={18} />
          <input
            type="search"
            placeholder="Search patients, appointments, notes"
            aria-label="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-600 shadow-sm shadow-slate-100/60 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          {query ? (
            <div className="absolute left-0 right-0 top-12 z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
              {isSearching ? (
                <p className="px-3 py-2 text-xs text-slate-500">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">No results found.</p>
              ) : (
                <ul className="max-h-64 overflow-auto">
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setResults([]);
                          router.push(result.href);
                        }}
                        className="flex w-full flex-col gap-1 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <span className="text-xs uppercase tracking-wide text-slate-400">{result.type}</span>
                        <span className="font-medium text-slate-900 dark:text-white">{result.label}</span>
                        {result.description ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">{result.description}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
            privacyMode
              ? "border-brand-indigo bg-brand-indigo text-white"
              : "border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-300",
          )}
          onClick={() => setPrivacyMode(!privacyMode)}
        >
          <ShieldCheck size={16} weight="bold" />
          Privacy Mode
        </button>

        <ThemeToggle />

        <div className="relative">
          <button
            type="button"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-slate-800 dark:text-slate-200"
            aria-label="View notifications"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
          >
            <Bell aria-hidden="true" className="h-5 w-5" weight="bold" />
            {notifications.length ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400" />
            ) : null}
          </button>
          {isNotificationsOpen ? (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-xl dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-400">Notifications</p>
                <MoonStars size={16} className="text-slate-400" />
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500">No new updates.</p>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((notification) => (
                    <li key={notification.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{notification.title}</p>
                      {notification.body ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{notification.body}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(notification.createdAt).toLocaleString("es-CO")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

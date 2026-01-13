"use client";

import { useEffect, useRef, useState } from "react";

import { Bell } from "@phosphor-icons/react";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  createdAt: string;
  readAt?: string | null;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    const response = await fetch("/api/notifications?limit=5");
    if (response.ok) {
      const data = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    if (response.ok) {
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-200"
        aria-label="Ver notificaciones"
        onClick={() => {
          setOpen((prev) => !prev);
          void loadNotifications();
        }}
      >
        <Bell aria-hidden="true" className="h-5 w-5" weight="bold" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg shadow-slate-200/40 dark:border-surface-muted dark:bg-surface-elevated">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Notificaciones
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} sin leer</span>
          </div>
          <div className="mt-3 space-y-3">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Sin novedades.</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border px-3 py-2 ${
                    notification.readAt
                      ? "border-slate-100 bg-white"
                      : "border-brand-teal/30 bg-brand-teal/5"
                  } dark:border-surface-muted dark:bg-surface-base/70`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{notification.title}</p>
                      {notification.body ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{notification.body}</p>
                      ) : null}
                    </div>
                    {!notification.readAt ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand-teal dark:text-accent-cyan"
                        onClick={() => markAsRead(notification.id)}
                      >
                        Marcar
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

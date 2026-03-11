"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Bell } from "@/components/ui/Icon";
import { Skeleton } from "@/app/portal/components/ui/Skeleton";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { groupNotificationsByDate } from "@/lib/notifications/groupNotifications";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  createdAt: string;
  readAt?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

function notificationHref(notification: NotificationItem) {
  if (notification.entityType === "appointment" && notification.entityId) {
    return `/portal/receptionist/schedule?appointment=${notification.entityId}`;
  }
  return null;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async (cursor?: string | null) => {
    setError(null);
    const params = new URLSearchParams({ limit: "8" });
    if (cursor) params.set("cursor", cursor);

    const response = await fetchWithRetry(`/api/notifications?${params.toString()}`);
    if (response.ok) {
      const data = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number; nextCursor: string | null };
      setNotifications((prev) => (cursor ? [...prev, ...data.notifications] : data.notifications));
      setUnreadCount(data.unreadCount);
      setNextCursor(data.nextCursor ?? null);
    } else {
      setError("No se pudo cargar la actividad.");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    void loadNotifications().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

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
    const response = await fetchWithTimeout(`/api/notifications/${id}`, { method: "PATCH" });
    if (response.ok) {
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }
  };

  const markAllAsRead = async () => {
    const response = await fetchWithTimeout("/api/notifications/read-all", { method: "PATCH" });
    if (!response.ok) return;
    setNotifications((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const groupedNotifications = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-200"
        aria-label="Ver notificaciones"
        onClick={() => {
          setOpen((prev) => !prev);
          setIsLoading(true);
          void loadNotifications().finally(() => setIsLoading(false));
        }}
      >
        <Bell aria-hidden="true" className="h-5 w-5" weight="bold" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div ref={panelRef} tabIndex={-1} className="absolute right-0 z-40 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg shadow-slate-200/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:bg-surface-elevated">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Centro de actividad
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} sin leer</span>
              <button type="button" className="text-[11px] font-semibold text-brand-teal" onClick={() => void markAllAsRead()}>
                Marcar todas como leídas
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-3" role="status" aria-live="polite">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : null}
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
            {!isLoading && !error && notifications.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Sin novedades.</p>
            ) : null}
            {!isLoading && !error
              ? Object.entries(groupedNotifications).map(([group, groupItems]) => (
                <div key={group} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group}</p>
                  {groupItems.map((notification) => {
                    const href = notificationHref(notification);
                    return (
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
                            <p className="mt-1 text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString("es-CO")}</p>
                            {href ? (
                              <Link className="mt-1 inline-flex text-xs font-semibold text-brand-teal" href={href}>
                                Ver en agenda
                              </Link>
                            ) : null}
                          </div>
                          {!notification.readAt ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-brand-teal dark:text-accent-cyan"
                              onClick={() => void markAsRead(notification.id)}
                            >
                              Marcar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
              : null}
            {!isLoading && !error && nextCursor ? (
              <button
                type="button"
                onClick={async () => {
                  setIsLoadingMore(true);
                  await loadNotifications(nextCursor);
                  setIsLoadingMore(false);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-600"
              >
                {isLoadingMore ? "Cargando..." : "Cargar más"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

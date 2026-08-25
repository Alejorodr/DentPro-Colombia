"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Bell, Trash } from "@/components/ui/Icon";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  createdAt: string;
  readAt?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  user?: { name?: string | null; lastName?: string | null; email?: string | null } | null;
};

type NotificationsDropdownProps = {
  scope?: "admin" | "user";
};

function buildEntityHref(notification: NotificationItem) {
  if (!notification.entityType || !notification.entityId) return null;
  switch (notification.entityType) {
    case "appointment":
      return `/portal/admin/appointments?appointment=${notification.entityId}`;
    case "patient":
      return `/portal/admin/patients?patient=${notification.entityId}`;
    case "professional":
      return `/portal/admin/staff?professional=${notification.entityId}`;
    case "service":
      return `/portal/admin/services?service=${notification.entityId}`;
    default:
      return null;
  }
}

export function NotificationsDropdown({ scope = "user" }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    const params = new URLSearchParams({ limit: "6", scope });
    if (unreadOnly) params.set("unread", "true");
    const response = await fetchWithRetry(`/api/notifications?${params.toString()}`);
    if (response.ok) {
      const data = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }, [scope, unreadOnly]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

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
    const response = await fetchWithTimeout(`/api/notifications/read-all?scope=${scope}`, { method: "PATCH" });
    if (!response.ok) return;
    setNotifications((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    const response = await fetchWithTimeout(`/api/notifications/${id}`, { method: "DELETE" });
    if (response.ok) {
      setNotifications((prev) => {
        const removed = prev.find((item) => item.id === id);
        if (removed && !removed.readAt) {
          setUnreadCount((count) => Math.max(count - 1, 0));
        }
        return prev.filter((item) => item.id !== id);
      });
    }
  };

  const notificationItems = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        href: buildEntityHref(notification),
        author:
          notification.user?.name || notification.user?.lastName
            ? `${notification.user?.name ?? ""} ${notification.user?.lastName ?? ""}`.trim()
            : notification.user?.email ?? null,
      })),
    [notifications],
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted dark:text-slate-200"
        aria-label="Ver notificaciones"
        onClick={() => {
          setOpen((prev) => !prev);
          void loadNotifications();
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
        <div className="absolute right-0 z-40 mt-3 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg shadow-slate-200/40 dark:border-surface-muted dark:bg-surface-elevated">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Notificaciones
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} sin leer</span>
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-teal dark:text-accent-cyan"
                onClick={() => void markAllAsRead()}
              >
                Marcar todas
              </button>
            </div>
          </div>
          <button
            type="button"
            className="mt-2 text-[11px] font-semibold text-slate-500 underline decoration-dotted dark:text-slate-400"
            onClick={() => setUnreadOnly((prev) => !prev)}
          >
            {unreadOnly ? "Ver todas" : "Ver solo no leídas"}
          </button>
          <div className="mt-3 space-y-3">
            {notificationItems.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Sin novedades.</p>
            ) : (
              notificationItems.map((notification) => (
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
                      {notification.author ? (
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {notification.author}
                        </p>
                      ) : null}
                      {notification.body ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{notification.body}</p>
                      ) : null}
                      {notification.href ? (
                        <Link
                          href={notification.href}
                          className="mt-2 inline-flex text-xs font-semibold text-brand-teal dark:text-accent-cyan"
                          onClick={() => setOpen(false)}
                        >
                          Ver detalle
                        </Link>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!notification.readAt ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-brand-teal dark:text-accent-cyan"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Marcar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Eliminar notificación"
                        className="text-slate-400 hover:text-rose-600 dark:text-slate-500"
                        onClick={() => void deleteNotification(notification.id)}
                      >
                        <Trash aria-hidden="true" className="h-4 w-4" weight="bold" />
                      </button>
                    </div>
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

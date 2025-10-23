"use client";

import { useCallback, useEffect, useState } from "react";

import { Moon, Sun } from "@phosphor-icons/react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function resolveInitialTheme(): Theme {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "light";
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // localStorage might be unavailable. Fall back to system preference below.
  }

  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());

  useEffect(() => {
    applyTheme(theme);

    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [theme]);

  const handleToggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const isDark = theme === "dark";
  const label = isDark ? "Activar modo claro" : "Activar modo oscuro";

  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted/70 dark:bg-surface-base/80 dark:text-slate-200 dark:hover:text-white dark:focus-visible:ring-accent-cyan/60"
      aria-label={label}
      title={label}
      onClick={handleToggle}
    >
      {isDark ? (
        <Moon aria-hidden="true" className="h-5 w-5" weight="bold" />
      ) : (
        <Sun aria-hidden="true" className="h-5 w-5" weight="bold" />
      )}
    </button>
  );
}

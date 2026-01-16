"use client";

import { useCallback, useEffect, useState } from "react";

import { Moon, Sun } from "@/components/ui/Icon";

type Theme = "light" | "dark";

type ThemeState = {
  theme: Theme;
  isManual: boolean;
};

const STORAGE_KEY = "theme";

function resolveInitialState(): ThemeState {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { theme: "light", isManual: false };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return { theme: stored, isManual: true };
    }
  } catch {
    // localStorage might be unavailable. Fall back to system preference below.
  }

  if (document.documentElement.classList.contains("dark")) {
    return { theme: "dark", isManual: false };
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return { theme: prefersDark ? "dark" : "light", isManual: false };
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
  const [{ theme, isManual }, setState] = useState<ThemeState>(() => resolveInitialState());

  useEffect(() => {
    applyTheme(theme);

    if (typeof window === "undefined") {
      return;
    }

    try {
      if (isManual) {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [theme, isManual]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (event: MediaQueryListEvent) => {
      setState((prev) => {
        if (prev.isManual) {
          return prev;
        }

        const nextTheme = event.matches ? "dark" : "light";
        if (prev.theme === nextTheme) {
          return prev;
        }

        return { theme: nextTheme, isManual: false };
      });
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  const setTheme = useCallback((updater: Theme | ((prev: Theme) => Theme), manual: boolean) => {
    setState((prev) => {
      const nextTheme = typeof updater === "function" ? updater(prev.theme) : updater;

      if (prev.theme === nextTheme && prev.isManual === manual) {
        return prev;
      }

      return { theme: nextTheme, isManual: manual };
    });
  }, []);

  const handleToggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"), true);
  }, [setTheme]);

  const isDark = theme === "dark";
  const label = isDark ? "Activar modo claro" : "Activar modo oscuro";

  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-teal/60 dark:border-surface-muted/70 dark:bg-surface-base/80 dark:text-slate-200 dark:hover:text-white dark:focus-visible:ring-accent-cyan/60"
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

"use client";

import { useEffect, useState } from "react";

type SafeStorageResult = {
  value: string | null;
  hasError: boolean;
};

function safeStorageGet(key: string): SafeStorageResult {
  if (typeof window === "undefined") {
    return { value: null, hasError: false };
  }

  try {
    return { value: window.localStorage.getItem(key), hasError: false };
  } catch {
    return { value: null, hasError: true };
  }
}

function safeStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function getStoredTheme(): "light" | "dark" {
  const { value: stored, hasError } = safeStorageGet("dentpro-theme");
  if (hasError) {
    return "light";
  }

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    safeStorageSet("dentpro-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      id="darkModeToggle"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      onClick={toggle}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-rail">
          <span className="glass-filter" aria-hidden="true"></span>
          <span className="glass-overlay" aria-hidden="true"></span>
          <span className="glass-specular" aria-hidden="true"></span>
          <span className="theme-toggle-icon material-symbols-rounded" data-theme-icon="sun" aria-hidden="true">
            light_mode
          </span>
          <span className="theme-toggle-icon material-symbols-rounded" data-theme-icon="moon" aria-hidden="true">
            dark_mode
          </span>
        </span>
        <span className="theme-toggle-thumb">
          <span className="glass-filter" aria-hidden="true"></span>
          <span className="glass-overlay" aria-hidden="true"></span>
          <span className="glass-specular" aria-hidden="true"></span>
        </span>
      </span>
    </button>
  );
}


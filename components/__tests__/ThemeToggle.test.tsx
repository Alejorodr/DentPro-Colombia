import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../ThemeToggle";

type MockMediaQuery = MediaQueryList & {
  setMatches(value: boolean): void;
};

describe("ThemeToggle", () => {
  let mockMediaQuery: MockMediaQuery;

  beforeEach(() => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();

    mockMediaQuery = {
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      }),
      removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      }),
      addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === "change") {
          listeners.add(listener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
        if (event === "change") {
          listeners.delete(listener);
        }
      }),
      dispatchEvent: vi.fn(() => true),
      setMatches(value: boolean) {
        mockMediaQuery.matches = value;
        const event = { matches: value, media: mockMediaQuery.media } as MediaQueryListEvent;

        listeners.forEach((listener) => listener(event));
        if (typeof mockMediaQuery.onchange === "function") {
          mockMediaQuery.onchange(event);
        }
      },
    } as MockMediaQuery;

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => mockMediaQuery),
    });

    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("toggles the theme and updates the accessible label", async () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Activar modo oscuro" });
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await userEvent.click(button);

    expect(button.getAttribute("aria-label")).toBe("Activar modo claro");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");

    await userEvent.click(button);

    expect(button.getAttribute("aria-label")).toBe("Activar modo oscuro");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("theme")).toBe("light");
  });

  it("applies the system preference on initial render", () => {
    mockMediaQuery.setMatches(true);

    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBeNull();
  });

  it("updates the theme when the system preference changes", async () => {
    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    mockMediaQuery.setMatches(true);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(window.localStorage.getItem("theme")).toBeNull();
    });
  });

  it("ignores system preference changes after a manual toggle", async () => {
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "Activar modo oscuro" });
    await userEvent.click(button);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe("dark");

    mockMediaQuery.setMatches(false);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(window.localStorage.getItem("theme")).toBe("dark");
    });
  });
});

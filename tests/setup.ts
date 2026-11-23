import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sin `globals: true`, Testing Library no desmonta automáticamente entre tests.
// Sin esto, React deja trabajo agendado que corre tras el teardown de jsdom
// ("window is not defined") y vitest 5 lo reporta como error no manejado.
afterEach(() => {
  cleanup();
});

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds: ReadonlyArray<number> = [0];

  disconnect(): void {}

  observe(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(): void {}
}

class MockResizeObserver implements ResizeObserver {
  disconnect(): void {}

  observe(): void {}

  unobserve(): void {}
}

globalThis.IntersectionObserver ??= MockIntersectionObserver;
globalThis.ResizeObserver ??= MockResizeObserver;

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// jsdom lacks these browser APIs; Recharts, Leaflet and the layouts touch them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverStub, writable: true });
}

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!window.scrollTo) {
  Object.defineProperty(window, "scrollTo", { writable: true, value: vi.fn() });
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (!URL.createObjectURL) {
  Object.defineProperty(URL, "createObjectURL", { writable: true, value: vi.fn(() => "blob:mock") });
  Object.defineProperty(URL, "revokeObjectURL", { writable: true, value: vi.fn() });
}

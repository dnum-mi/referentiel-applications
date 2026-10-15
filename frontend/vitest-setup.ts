// setupTests.ts
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

globalThis.matchMedia = function (query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };
};

// setupTests.ts
import "@testing-library/jest-dom/vitest";

globalThis.matchMedia = function () {
  return { matches: false };
};

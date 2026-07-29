import { isChunkLoadError, reloadOnStaleChunk } from "./stale-chunk";

const reload = vi.fn();
const assign = vi.fn();

describe("reloadOnStaleChunk", () => {
  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    assign.mockClear();
    vi.stubGlobal("location", { reload, assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("should reload the page on first call", () => {
    // When
    const result = reloadOnStaleChunk();

    // Then
    expect(result).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("should navigate to the target url when provided", () => {
    // When
    const result = reloadOnStaleChunk("/applications/42");

    // Then
    expect(result).toBe(true);
    expect(assign).toHaveBeenCalledWith("/applications/42");
    expect(reload).not.toHaveBeenCalled();
  });

  it("should not reload twice in a row (anti-boucle)", () => {
    // Given
    reloadOnStaleChunk();

    // When
    const result = reloadOnStaleChunk();

    // Then
    expect(result).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("should reload again once the anti-boucle window has elapsed", () => {
    // Given
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T10:00:00Z"));
    reloadOnStaleChunk();

    // When
    vi.setSystemTime(new Date("2026-07-29T10:00:11Z"));
    const result = reloadOnStaleChunk();

    // Then
    expect(result).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});

describe("isChunkLoadError", () => {
  it.each([
    "Failed to fetch dynamically imported module: https://rda/assets/QualityPage-abc123.js",
    "error loading dynamically imported module",
    "Importing a module script failed.",
    "Unable to preload CSS for /assets/index-abc123.css",
  ])("should detect chunk load errors (%s)", (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it("should ignore other errors", () => {
    expect(isChunkLoadError(new Error("Network request failed"))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

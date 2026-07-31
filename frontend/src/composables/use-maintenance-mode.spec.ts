import { isMaintenanceResponse, maintenanceModeState, refreshMaintenanceMode, setMaintenanceMode } from "./use-maintenance-mode";

describe("useMaintenanceMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setMaintenanceMode(false);
  });

  it("updates the shared state from the health check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          maintenance: true,
          version: "v1.86.0",
          etat: "OK",
        }),
      }),
    );

    await refreshMaintenanceMode();

    expect(maintenanceModeState.value).toBe(true);
  });

  it("keeps the last known state when the health check fails", async () => {
    setMaintenanceMode(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await refreshMaintenanceMode();

    expect(maintenanceModeState.value).toBe(true);
  });

  it("only accepts responses with a boolean maintenance flag", () => {
    expect(isMaintenanceResponse({ maintenance: false })).toBe(true);
    expect(isMaintenanceResponse({ maintenance: "false" })).toBe(false);
    expect(isMaintenanceResponse(null)).toBe(false);
  });
});

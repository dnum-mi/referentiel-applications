import { checkForUpdate } from "./use-app-update";

vi.mock("virtual:pwa-register/vue", () => ({
  useRegisterSW: vi.fn(() => ({
    offlineReady: { value: false },
    needRefresh: { value: false },
    updateServiceWorker: vi.fn(),
  })),
}));

function makeRegistration(overrides: Partial<ServiceWorkerRegistration> = {}) {
  return { installing: null, update: vi.fn().mockResolvedValue(undefined), ...overrides } as unknown as ServiceWorkerRegistration;
}

describe("checkForUpdate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should trigger a service worker update when sw.js is reachable", async () => {
    // Given
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
    const registration = makeRegistration();

    // When
    await checkForUpdate("/sw.js", registration);

    // Then
    expect(registration.update).toHaveBeenCalledOnce();
  });

  it("should not update when the server does not serve sw.js", async () => {
    // Given
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404 }));
    const registration = makeRegistration();

    // When
    await checkForUpdate("/sw.js", registration);

    // Then
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("should not update when the network is unreachable", async () => {
    // Given
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const registration = makeRegistration();

    // When
    await checkForUpdate("/sw.js", registration);

    // Then
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("should skip the check when an installation is already in progress", async () => {
    // Given
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const registration = makeRegistration({ installing: {} as ServiceWorker });

    // When
    await checkForUpdate("/sw.js", registration);

    // Then
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(registration.update).not.toHaveBeenCalled();
  });
});

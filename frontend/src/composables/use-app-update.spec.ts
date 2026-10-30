import { useRegisterSW } from "virtual:pwa-register/vue";
import { effectScope, ref } from "vue";
import { checkForUpdate, useAppUpdate } from "./use-app-update";

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

describe("useAppUpdate — activation demandée par l'utilisateur", () => {
  let scope: ReturnType<typeof effectScope>;
  const reload = vi.fn();
  const activate = vi.fn<() => Promise<void>>();

  beforeEach(() => {
    vi.useFakeTimers();
    reload.mockClear();
    activate.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal("window", { location: { reload } });
    vi.mocked(useRegisterSW).mockReturnValue({ needRefresh: ref(true), offlineReady: ref(false), updateServiceWorker: activate });
    scope = effectScope();
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function start(waiting: ServiceWorker | null = null) {
    const state = scope.run(useAppUpdate);
    if (!state) throw new Error("Composable not mounted");
    const options = vi.mocked(useRegisterSW).mock.lastCall?.[0];
    options?.onRegisteredSW?.("/sw.js", makeRegistration({ waiting }));
    return { state, options };
  }

  function worker() {
    const target = Object.assign(new EventTarget(), { state: "installed" as ServiceWorkerState });
    return {
      value: target as unknown as ServiceWorker,
      change(state: ServiceWorkerState) {
        target.state = state;
        target.dispatchEvent(new Event("statechange"));
      },
    };
  }

  it("recharge au clic lorsque la nouvelle version est déjà active sans worker en attente", async () => {
    const { state } = start();
    expect(reload).not.toHaveBeenCalled();
    await state.updateServiceWorker(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("attend l'activation réelle même si l'envoi de SKIP_WAITING a déjà abouti", async () => {
    const waiting = worker();
    const { state } = start(waiting.value);
    const update = state.updateServiceWorker(true);
    await Promise.resolve();
    expect(reload).not.toHaveBeenCalled();
    waiting.change("activating");
    expect(reload).not.toHaveBeenCalled();
    waiting.change("activated");
    await update;
    expect(reload).toHaveBeenCalledOnce();
  });

  it("couvre une activation déjà terminée au moment du clic", async () => {
    const waiting = worker();
    waiting.change("activated");
    const { state } = start(waiting.value);
    await state.updateServiceWorker(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("ne recharge pas spontanément lorsqu'un autre onglet active une version", () => {
    const { options } = start();
    options?.onNeedReload?.();
    expect(reload).not.toHaveBeenCalled();
  });

  it("ne recharge qu'une fois lorsque le plugin signale aussi la prise de contrôle", async () => {
    const waiting = worker();
    const { state, options } = start(waiting.value);
    const update = state.updateServiceWorker(true);
    waiting.change("activated");
    options?.onNeedReload?.();
    await update;
    options?.onNeedReload?.();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("permet de réessayer après un échec d'activation sans rechargement tardif", async () => {
    const waiting = worker();
    const { state, options } = start(waiting.value);
    const update = state.updateServiceWorker(true);
    const rejected = expect(update).rejects.toThrow();
    waiting.change("redundant");
    await rejected;
    options?.onNeedReload?.();
    expect(reload).not.toHaveBeenCalled();
    waiting.change("installed");
    const retry = state.updateServiceWorker(true);
    waiting.change("activated");
    await retry;
    expect(reload).toHaveBeenCalledOnce();
  });

  it("borne l'attente et ignore une activation tardive après expiration", async () => {
    const waiting = worker();
    const { state, options } = start(waiting.value);
    await Promise.all([expect(state.updateServiceWorker(true)).rejects.toThrow(), vi.advanceTimersByTimeAsync(30_000)]);
    waiting.change("activated");
    options?.onNeedReload?.();
    expect(reload).not.toHaveBeenCalled();
  });

  it("nettoie l'attente et les écouteurs lorsque l'application est démontée", async () => {
    const waiting = worker();
    const { state, options } = start(waiting.value);
    const rejected = expect(state.updateServiceWorker(true)).rejects.toThrow();
    scope.stop();
    await rejected;
    waiting.change("activated");
    options?.onNeedReload?.();
    expect(reload).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("propage l'échec d'envoi et autorise une nouvelle tentative", async () => {
    const waiting = worker();
    const { state, options } = start(waiting.value);
    activate.mockRejectedValueOnce(new Error("postMessage failed"));
    await expect(state.updateServiceWorker(true)).rejects.toThrow("postMessage failed");
    options?.onNeedReload?.();
    expect(reload).not.toHaveBeenCalled();
    const retry = state.updateServiceWorker(true);
    waiting.change("activated");
    await retry;
    expect(reload).toHaveBeenCalledOnce();
  });
});

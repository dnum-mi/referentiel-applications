// @vitest-environment node
import { createServer } from "node:http";
import { once } from "node:events";
import { API_TIMEOUT_MS, fetchWithTimeout } from "./fetch-with-timeout";

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function waitForAbort(signal: AbortSignal | null | undefined): Promise<Response> {
    return new Promise((_resolve, reject) => {
      if (signal?.aborted) reject(signal.reason);
      else signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  }

  it("applique le délai de 10 secondes au vrai transport fetch", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const response = new Response("ok");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    const request = new Request("https://refapp.test/api/v2/hostings", {
      headers: { Authorization: "Bearer test" },
      credentials: "include",
    });

    await expect(fetchWithTimeout(request)).resolves.toBe(response);
    expect(timeoutSpy).toHaveBeenCalledWith(API_TIMEOUT_MS);
    expect(API_TIMEOUT_MS).toBe(10_000);
    expect(fetchMock).toHaveBeenCalledWith(request, { signal: expect.any(AbortSignal) });
  });

  it("interrompt une requête qui ne répond pas", async () => {
    const server = createServer(() => {});
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Adresse HTTP de test indisponible");
      const request = new Request(`http://127.0.0.1:${address.port}/api/v2/hostings`);
      await expect(fetchWithTimeout(request, 50)).rejects.toMatchObject({ name: "TimeoutError" });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  it("préserve l'annulation explicite de l'appelant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation((_request, init) => waitForAbort(init?.signal)),
    );
    const controller = new AbortController();
    const request = new Request("https://refapp.test/api/v2/hostings", { signal: controller.signal });
    const pending = fetchWithTimeout(request);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("interrompt aussi un corps bloqué après réception des en-têtes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(async (_request, init) => {
        const body = new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener("abort", () => controller.error(init.signal?.reason), { once: true });
          },
        });
        return new Response(body);
      }),
    );
    const response = await fetchWithTimeout(new Request("https://refapp.test/api/v2/hostings"), 10);
    await expect(response.text()).rejects.toMatchObject({ name: "TimeoutError" });
  });
});

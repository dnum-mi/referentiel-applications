// @vitest-environment node
import { createPinia, setActivePinia } from "pinia";
import { client } from "@/client/client.gen";
import { fetchWithTimeout } from "@/api/fetch-with-timeout";
import { useApplicationStore } from "./applicationStore";

const { downloadBlob } = vi.hoisted(() => ({
  downloadBlob: vi.fn<(blob: Blob, filename: string) => void>(),
}));

vi.mock("@/router", () => ({ default: { push: vi.fn() } }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }),
}));
vi.mock("@/utils/download-blob", () => ({ downloadBlob }));

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const workbookBytes = Uint8Array.from([80, 75, 3, 4, 0, 255, 13, 10]);

/** Le SDK et fetchWithTimeout restent réels ; seuls le réseau et l'horloge sont pilotés. */
function respondAfter(delayMs: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation(
      (_request, init) =>
        new Promise<Response>((resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(signal.reason);
            return;
          }
          const timer = setTimeout(() => {
            signal?.removeEventListener("abort", abort);
            resolve(new Response(workbookBytes, { headers: { "Content-Type": XLSX_TYPE } }));
          }, delayMs);
          function abort() {
            clearTimeout(timer);
            reject(signal?.reason);
          }
          signal?.addEventListener("abort", abort, { once: true });
        }),
    ),
  );
}

describe("applicationStore.downloadExcel — délai du vrai client HTTP", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    downloadBlob.mockClear();
    vi.useFakeTimers();
    // Le minuteur natif AbortSignal.timeout n'utilise pas l'horloge simulée de Vitest.
    vi.spyOn(AbortSignal, "timeout").mockImplementation((delayMs) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Délai dépassé", "TimeoutError")), delayMs);
      return controller.signal;
    });
    client.setConfig({ baseUrl: "https://refapp.test", fetch: fetchWithTimeout, parseAs: "auto" });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("télécharge un export de 15 secondes sans prolonger le délai des autres appels", async () => {
    respondAfter(15_000);
    const exported = useApplicationStore()
      .downloadExcel({})
      .then(
        () => "downloaded",
        (error: unknown) => error,
      );
    const ordinaryRequest = client.get({ url: "/api/v2/applications" });

    await vi.advanceTimersByTimeAsync(10_001);
    expect(downloadBlob).not.toHaveBeenCalled();
    expect((await ordinaryRequest).error).toMatchObject({ name: "TimeoutError" });

    await vi.advanceTimersByTimeAsync(4_999);
    expect(await exported).toBe("downloaded");
    expect(downloadBlob).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), expect.stringMatching(/^applications_export_.*\.xlsx$/));
    const [blob] = downloadBlob.mock.calls[0];
    expect(blob.type).toBe(XLSX_TYPE);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(workbookBytes);
  });

  it("interrompt un export après cinq minutes et conserve la cause sans télécharger", async () => {
    respondAfter(301_000);
    let settled = false;
    const exported = useApplicationStore()
      .downloadExcel({})
      .catch((error: unknown) => error)
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(299_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await exported).toMatchObject({ message: "Erreur lors de l'export Excel.", cause: { name: "TimeoutError" } });
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it("conserve un refus serveur sans déclencher de téléchargement", async () => {
    const payload = { statusCode: 403, message: "Forbidden" };
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload, { status: 403 })));

    await expect(useApplicationStore().downloadExcel({})).rejects.toMatchObject({
      message: "Erreur lors de l'export Excel.",
      cause: payload,
    });
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});

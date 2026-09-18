import { ref } from "vue";
import { callApi, withLoading } from "./call-api";

describe("callApi", () => {
  const toaster = { addErrorMessage: vi.fn() };
  const errorMessage = "Impossible de charger les données.";

  beforeEach(() => {
    toaster.addErrorMessage.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("retourne les données et termine le chargement", async () => {
    const isLoading = ref(false);
    const pending = callApi(async () => ({ data: [1, 2], response: { ok: true, statusText: "OK" } }), {
      isLoading,
      toaster,
      errorMessage,
    });
    expect(isLoading.value).toBe(true);
    await expect(pending).resolves.toEqual([1, 2]);
    expect(isLoading.value).toBe(false);
    expect(toaster.addErrorMessage).not.toHaveBeenCalled();
  });

  it("signale un refus HTTP puis propage l'erreur", async () => {
    const isLoading = ref(false);
    const pending = callApi(async () => ({ error: { message: "Forbidden" }, response: { ok: false, statusText: "Forbidden" } }), {
      isLoading,
      toaster,
      errorMessage,
    });
    await expect(pending).rejects.toThrow(errorMessage);
    expect(isLoading.value).toBe(false);
    expect(toaster.addErrorMessage).toHaveBeenCalledExactlyOnceWith(errorMessage);
  });

  it.each(["network", "synchronous"])("libère le chargement après une erreur %s", async (failure) => {
    const isLoading = ref(false);
    const error = new TypeError("Failed to fetch");
    const pending = callApi(
      () => {
        if (failure === "synchronous") throw error;
        return Promise.reject(error);
      },
      { isLoading, toaster, errorMessage },
    );
    await expect(pending).rejects.toBe(error);
    expect(isLoading.value).toBe(false);
    expect(toaster.addErrorMessage).toHaveBeenCalledExactlyOnceWith(errorMessage);
  });

  it("attend la fin de tous les appels partageant la même ref", async () => {
    const isLoading = ref(false);
    let finishLast = () => {};
    const last = withLoading(isLoading, () => new Promise<void>((resolve) => (finishLast = resolve)));
    await withLoading(isLoading, async () => "first");
    expect(isLoading.value).toBe(true);
    finishLast();
    await last;
    expect(isLoading.value).toBe(false);
  });

  it("ne désactive pas le chargement extérieur après un appel imbriqué", async () => {
    const isLoading = ref(false);
    await withLoading(isLoading, async () => {
      await withLoading(isLoading, async () => undefined);
      expect(isLoading.value).toBe(true);
    });
    expect(isLoading.value).toBe(false);
  });
});

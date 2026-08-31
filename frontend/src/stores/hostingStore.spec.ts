import { createPinia, setActivePinia } from "pinia";
import type { HostingDto } from "@/client/types.gen";
import { useHostingStore } from "./hostingStore";

const { findAllMock } = vi.hoisted(() => ({ findAllMock: vi.fn() }));

vi.mock("@/api/index", () => ({
  default: { applicationHostingsControllerFindAll: findAllMock },
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: vi.fn() }),
}));

const hosting = (id: string) => ({ id }) as unknown as HostingDto;

const okResponse = (data: HostingDto[]) => ({
  response: { ok: true, statusText: "OK" },
  data,
});

describe("hostingStore — cloisonnement par fiche", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    findAllMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("ne conserve pas les hébergements de la fiche précédente quand l'appel échoue", async () => {
    findAllMock.mockResolvedValueOnce(okResponse([hosting("h-1")]));
    const store = useHostingStore();
    await store.fetchHostings("app-1");

    findAllMock.mockResolvedValueOnce({
      response: { ok: false, statusText: "Forbidden" },
      error: {},
    });
    await expect(store.fetchHostings("app-2")).rejects.toThrow();

    expect(store.hostings).toStrictEqual([]);
  });

  it("ignore une réponse tardive qui ne concerne plus la fiche affichée", async () => {
    const store = useHostingStore();

    let releaseStale: (value: unknown) => void = () => {};
    findAllMock.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseStale = resolve;
      }),
    );
    const stalePending = store.fetchHostings("app-1");

    findAllMock.mockResolvedValueOnce(okResponse([hosting("h-courant")]));
    await store.fetchHostings("app-2");

    releaseStale(okResponse([hosting("h-perime")]));
    await stalePending;

    expect(store.hostings).toStrictEqual([hosting("h-courant")]);
  });

  it("resetHostings vide le store et son rattachement", async () => {
    findAllMock.mockResolvedValueOnce(okResponse([hosting("h-1")]));
    const store = useHostingStore();
    await store.fetchHostings("app-1");

    store.resetHostings();

    expect(store.hostings).toStrictEqual([]);
    expect(store.hostingsApplicationId).toBeNull();
  });
});

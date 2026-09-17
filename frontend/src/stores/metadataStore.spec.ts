import { createPinia, setActivePinia } from "pinia";
import type { MetadataDto } from "@/client/types.gen";
import { useMetadataStore } from "./metadataStore";

const { getFirstAndLastMock, findByApplicationMock, findGlobalMock, addErrorMessage } = vi.hoisted(() => ({
  getFirstAndLastMock: vi.fn(),
  findByApplicationMock: vi.fn(),
  findGlobalMock: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    applicationMetadatasControllerGetFirstAndLastMetadata: getFirstAndLastMock,
    applicationMetadatasControllerFind: findByApplicationMock,
    metadatasControllerFind: findGlobalMock,
  },
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage }),
}));

const metadataOf = (email: string): MetadataDto =>
  ({
    id: `metadata-${email}`,
    createdAt: "2026-07-28T10:00:00.000Z",
    createdBy: { email },
  }) as unknown as MetadataDto;

const okResponse = (first: MetadataDto | null, last: MetadataDto | null) => ({
  response: { ok: true, statusText: "OK" },
  data: { first, last },
});

describe("metadataStore — metadatas de fiche", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getFirstAndLastMock.mockReset();
    findByApplicationMock.mockReset();
    findGlobalMock.mockReset();
    addErrorMessage.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(["firstAndLast", "byApplication", "global"])("libère le chargement et propage les rejets réseau (%s)", async (scope) => {
    const error = new TypeError("Failed to fetch");
    getFirstAndLastMock.mockRejectedValue(error);
    findByApplicationMock.mockRejectedValue(error);
    findGlobalMock.mockRejectedValue(error);
    const store = useMetadataStore();
    const pending =
      scope === "firstAndLast"
        ? store.getFirstAndLastMetadataByApplication("app-1")
        : scope === "byApplication"
          ? store.fetchMetadatasByApplication("app-1")
          : store.fetchMetadatasGlobal();

    await expect(pending).rejects.toBe(error);
    expect(store.isLoading).toBe(false);
    expect(addErrorMessage).toHaveBeenCalledTimes(1);
  });

  it("notifie les erreurs HTTP de l'historique global et purge l'ancienne page", async () => {
    const store = useMetadataStore();
    store.metadatas = [metadataOf("agent@example.gouv.fr")];
    store.total = 1;
    findGlobalMock.mockResolvedValue({ response: { ok: false, statusText: "Internal Server Error" }, error: {} });
    await expect(store.fetchMetadatasGlobal()).rejects.toThrow();
    expect(store.metadatas).toEqual([]);
    expect(store.total).toBe(0);
    expect(store.isLoading).toBe(false);
    expect(addErrorMessage).toHaveBeenCalledExactlyOnceWith("Erreur lors de la récupération des metadatas globales.");
  });

  it("expose les metadatas de l'application demandée", async () => {
    const mine = metadataOf("agent.a@example.gouv.fr");
    getFirstAndLastMock.mockResolvedValue(okResponse(mine, mine));
    const store = useMetadataStore();

    await store.getFirstAndLastMetadataByApplication("app-1");

    expect(store.firstMetadata).toStrictEqual(mine);
    expect(store.lastMetadata).toStrictEqual(mine);
  });

  it("purge les metadatas quand on ne peut pas les charger pour la fiche courante", async () => {
    const mine = metadataOf("agent.a@example.gouv.fr");
    getFirstAndLastMock.mockResolvedValue(okResponse(mine, mine));
    const store = useMetadataStore();
    await store.getFirstAndLastMetadataByApplication("app-1");

    // Fiche hors périmètre : aucun appel, donc purge explicite.
    store.resetFirstAndLastMetadata();

    expect(store.firstMetadata).toBeNull();
    expect(store.lastMetadata).toBeNull();
  });

  it("ne conserve pas les metadatas de la fiche précédente quand l'appel échoue", async () => {
    const mine = metadataOf("agent.a@example.gouv.fr");
    getFirstAndLastMock.mockResolvedValueOnce(okResponse(mine, mine));
    const store = useMetadataStore();
    await store.getFirstAndLastMetadataByApplication("app-1");

    getFirstAndLastMock.mockResolvedValueOnce({
      response: { ok: false, statusText: "Forbidden" },
      error: {},
    });
    await expect(store.getFirstAndLastMetadataByApplication("app-2")).rejects.toThrow();

    expect(store.firstMetadata).toBeNull();
    expect(store.lastMetadata).toBeNull();
  });

  it("ignore une réponse tardive qui ne concerne plus la fiche affichée", async () => {
    const stale = metadataOf("agent.a@example.gouv.fr");
    const current = metadataOf("agent.b@example.gouv.fr");
    const store = useMetadataStore();

    let releaseStale: (value: unknown) => void = () => {};
    getFirstAndLastMock.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseStale = resolve;
      }),
    );
    const stalePending = store.getFirstAndLastMetadataByApplication("app-1");

    getFirstAndLastMock.mockResolvedValueOnce(okResponse(current, current));
    await store.getFirstAndLastMetadataByApplication("app-2");

    releaseStale(okResponse(stale, stale));
    await stalePending;

    expect(store.firstMetadata).toStrictEqual(current);
    expect(store.lastMetadata).toStrictEqual(current);
  });
});

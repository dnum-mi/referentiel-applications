import { createPinia, setActivePinia } from "pinia";
import type { MetadataDto } from "@/client/types.gen";
import { useMetadataStore } from "./metadataStore";

const { getFirstAndLastMock } = vi.hoisted(() => ({
  getFirstAndLastMock: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    applicationMetadatasControllerGetFirstAndLastMetadata: getFirstAndLastMock,
  },
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: vi.fn() }),
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
    vi.spyOn(console, "error").mockImplementation(() => {});
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

import { createPinia, setActivePinia } from "pinia";
import type { OrganizationDto } from "@/client/types.gen";
import { useOrganizationStore } from "./organizationStore";

const { findAllMock } = vi.hoisted(() => ({ findAllMock: vi.fn() }));

vi.mock("@/api/index", () => ({
  default: { organizationsControllerFindAll: findAllMock },
}));

const organization = (id: string): OrganizationDto => ({ id, path: id, url: null, sigle: null, parentId: null, businessDivisionId: null });

const okResponse = (results: OrganizationDto[]) => ({
  response: { ok: true },
  data: { results },
});

describe("organizationStore — sans limite de pagination", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    findAllMock.mockReset();
  });

  it("recherche toutes les organisations correspondantes (pageSize 0)", async () => {
    findAllMock.mockResolvedValueOnce(okResponse([organization("org-1")]));
    const store = useOrganizationStore();

    await store.find("SEIN");

    expect(findAllMock).toHaveBeenCalledExactlyOnceWith({
      query: { search: "SEIN", usedOnly: undefined, pageSize: 0 },
    });
  });

  it("charge toutes les organisations demandées par id (pageSize 0)", async () => {
    findAllMock.mockResolvedValueOnce(okResponse([organization("org-1")]));
    const store = useOrganizationStore();

    await expect(store.getById("org-1")).resolves.toEqual(organization("org-1"));

    expect(findAllMock).toHaveBeenCalledExactlyOnceWith({
      query: { ids: ["org-1"], pageSize: 0 },
    });
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("organizationStore — demandes concurrentes", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    findAllMock.mockReset();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("termine tous les appels simultanés du même identifiant avec un seul chargement", async () => {
    const org = organization("org-1");
    findAllMock.mockResolvedValueOnce(okResponse([org]));
    const store = useOrganizationStore();
    const settled: (OrganizationDto | undefined)[] = [];
    const first = store.getById("org-1").then((value) => settled.push(value));
    const second = store.fetchById("org-1").then((value) => settled.push(value));

    await vi.advanceTimersByTimeAsync(10);

    expect(settled).toEqual([org, org]);
    await Promise.all([first, second]);
    expect(findAllMock).toHaveBeenCalledExactlyOnceWith({ query: { ids: ["org-1"], pageSize: 0 } });
    await expect(store.getById("org-1")).resolves.toEqual(org);
    expect(findAllMock).toHaveBeenCalledOnce();
  });

  it("rattache un nouvel abonné à une demande déjà partie sans second batch", async () => {
    const response = deferred<ReturnType<typeof okResponse>>();
    findAllMock.mockReturnValueOnce(response.promise);
    const store = useOrganizationStore();
    const first = store.getById("org-1");
    await vi.advanceTimersByTimeAsync(10);
    const second = store.getById("org-1");
    await vi.advanceTimersByTimeAsync(10);

    expect(findAllMock).toHaveBeenCalledOnce();
    response.resolve(okResponse([organization("org-1")]));
    await expect(Promise.all([first, second])).resolves.toEqual([organization("org-1"), organization("org-1")]);
  });

  it("termine les demandes absentes d'un résultat partiel sans les mettre en cache", async () => {
    const org = organization("org-1");
    findAllMock.mockResolvedValueOnce(okResponse([org]));
    const store = useOrganizationStore();
    const settled: (OrganizationDto | undefined)[] = [];
    store.getById("org-1").then((value) => settled.push(value));
    store.getById("org-absente").then((value) => settled.push(value));

    await vi.advanceTimersByTimeAsync(10);

    expect(settled).toEqual([org, undefined]);
    expect(store.organizations).toEqual({ "org-1": org });
    expect(store.error).toBeNull();
    findAllMock.mockResolvedValueOnce(okResponse([organization("org-absente")]));
    const retry = store.getById("org-absente");
    await vi.advanceTimersByTimeAsync(10);
    await expect(retry).resolves.toEqual(organization("org-absente"));
  });

  it.each([okResponse([]), { response: { ok: true }, data: {} }])("termine aussi un résultat entièrement absent : %j", async (response) => {
    findAllMock.mockResolvedValueOnce(response);
    const store = useOrganizationStore();
    const settled: (OrganizationDto | undefined)[] = [];
    store.getById("org-1").then((value) => settled.push(value));

    await vi.advanceTimersByTimeAsync(10);

    expect(settled).toEqual([undefined]);
    expect(store.organizations).toEqual({});
    expect(store.error).toBeNull();
  });

  it.each([
    { label: "HTTP 403", result: { response: { ok: false, status: 403 }, error: {} } },
    { label: "HTTP 503", result: { response: { ok: false, status: 503 }, error: {} } },
    { label: "erreur de décodage sur HTTP 200", result: { response: { ok: true }, error: new SyntaxError("JSON invalide") } },
    { label: "erreur réseau", result: new TypeError("Failed to fetch") },
  ])("termine tous les abonnés après $label puis autorise un réessai", async ({ result }) => {
    if (result instanceof Error) findAllMock.mockRejectedValueOnce(result);
    else findAllMock.mockResolvedValueOnce(result);
    const store = useOrganizationStore();
    const settled: (OrganizationDto | undefined)[] = [];
    store.getById("org-1").then((value) => settled.push(value));
    store.getById("org-1").then((value) => settled.push(value));
    store.getById("org-2").then((value) => settled.push(value));

    await vi.advanceTimersByTimeAsync(10);

    expect(settled).toEqual([undefined, undefined, undefined]);
    expect(store.organizations).toEqual({});
    expect(store.error).toEqual(expect.any(String));

    findAllMock.mockResolvedValueOnce(okResponse([organization("org-1")]));
    const retry = store.getById("org-1");
    await vi.advanceTimersByTimeAsync(10);
    await expect(retry).resolves.toEqual(organization("org-1"));
    expect(store.error).toBeNull();
    expect(findAllMock).toHaveBeenLastCalledWith({ query: { ids: ["org-1"], pageSize: 0 } });
  });

  it("termine séparément les batches qui répondent dans l'ordre inverse", async () => {
    const firstResponse = deferred<ReturnType<typeof okResponse>>();
    const secondResponse = deferred<ReturnType<typeof okResponse>>();
    findAllMock.mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise);
    const store = useOrganizationStore();
    const first = store.getById("org-1");
    await vi.advanceTimersByTimeAsync(10);
    const second = store.getById("org-2");
    await vi.advanceTimersByTimeAsync(10);

    secondResponse.resolve(okResponse([organization("org-2")]));
    await expect(second).resolves.toEqual(organization("org-2"));
    firstResponse.resolve(okResponse([organization("org-1")]));
    await expect(first).resolves.toEqual(organization("org-1"));
    expect(findAllMock).toHaveBeenNthCalledWith(1, { query: { ids: ["org-1"], pageSize: 0 } });
    expect(findAllMock).toHaveBeenNthCalledWith(2, { query: { ids: ["org-2"], pageSize: 0 } });
  });
});

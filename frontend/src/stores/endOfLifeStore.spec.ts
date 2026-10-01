import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";
import { Roles, type EndOfLifeApplicationDto } from "@/client/types.gen";
import { useEndOfLifeStore } from "./endOfLifeStore";

const { findApplicationsMock, addErrorMessage } = vi.hoisted(() => ({ findApplicationsMock: vi.fn(), addErrorMessage: vi.fn() }));
const userStore = reactive({
  canListTechnologies: true,
  user: {
    id: "user-1",
    role: Roles.ADMIN as Roles,
    scopeOrganizationId: null as string | null,
    scopeOrganization: null as { path: string } | null,
  },
});

vi.mock("@/api/index", () => ({ default: { endOfLifeControllerFindEndOfLifeApplications: findApplicationsMock } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage }) }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));

function application(id: string): EndOfLifeApplicationDto {
  return { id, label: id, shortName: id, organizationPaths: [], worstStatus: "eol", technologies: [] };
}

const okResponse = (id: string) => ({ response: { ok: true }, data: { results: [application(id)], total: 1 } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("endOfLifeStore — capacité, identité et périmètre", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    userStore.canListTechnologies = true;
    userStore.user = { id: "user-1", role: Roles.ADMIN, scopeOrganizationId: null, scopeOrganization: null };
    findApplicationsMock.mockReset();
    addErrorMessage.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("ne fait aucun appel sans autorisation", async () => {
    userStore.canListTechnologies = false;
    const store = useEndOfLifeStore();
    await store.fetchApplications();
    expect(findApplicationsMock).not.toHaveBeenCalled();
    expect(store.applications).toEqual([]);
    expect(store.isLoading).toBe(false);
  });

  it("purge les données dès le retrait de la capacité et ignore la réponse en cours", async () => {
    const pending = deferred<ReturnType<typeof okResponse>>();
    findApplicationsMock.mockResolvedValueOnce(okResponse("visible")).mockReturnValueOnce(pending.promise);
    const store = useEndOfLifeStore();
    await store.fetchApplications();
    expect(findApplicationsMock).toHaveBeenCalledWith({ query: { status: "all" } });
    expect(store.applications).toEqual([application("visible")]);

    userStore.canListTechnologies = false;
    expect(store.applications).toEqual([]);
    expect(store.total).toBe(0);

    userStore.canListTechnologies = true;
    const loading = store.fetchApplications();
    userStore.canListTechnologies = false;
    pending.resolve(okResponse("réponse-révoquée"));
    await loading;
    expect(store.applications).toEqual([]);
    expect(store.isLoading).toBe(false);
  });

  it.each(["identité", "rôle", "périmètre"])("ignore une réponse après changement de %s", async (change) => {
    const stale = deferred<ReturnType<typeof okResponse>>();
    findApplicationsMock.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(okResponse("nouveau-contexte"));
    const store = useEndOfLifeStore();
    const oldRequest = store.fetchApplications();

    if (change === "identité") userStore.user.id = "user-2";
    if (change === "rôle") userStore.user.role = Roles.READER;
    if (change === "périmètre") {
      userStore.user.scopeOrganizationId = "org-2";
      userStore.user.scopeOrganization = { path: "MI/DNUM" };
    }
    expect(store.isLoading).toBe(false);
    await store.fetchApplications();
    stale.resolve(okResponse("ancien-contexte"));
    await oldRequest;

    expect(store.applications).toEqual([application("nouveau-contexte")]);
    expect(store.total).toBe(1);
    expect(store.isLoading).toBe(false);
  });

  it("un ancien filtre ne remplace pas la réponse du filtre courant", async () => {
    const stale = deferred<ReturnType<typeof okResponse>>();
    findApplicationsMock.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(okResponse("filtre-courant"));
    const store = useEndOfLifeStore();
    const oldRequest = store.fetchApplications({ search: "ancien" });
    await store.fetchApplications({ search: "courant" });
    stale.resolve(okResponse("ancien-filtre"));
    await oldRequest;

    expect(store.applications).toEqual([application("filtre-courant")]);
  });

  it("ne conserve aucune donnée après un refus de l'API", async () => {
    findApplicationsMock.mockResolvedValueOnce(okResponse("ancienne-liste")).mockResolvedValueOnce({ response: { ok: false }, error: {} });
    const store = useEndOfLifeStore();
    await store.fetchApplications();
    await store.fetchApplications();
    expect(store.applications).toEqual([]);
    expect(store.total).toBe(0);
    expect(store.isLoading).toBe(false);
    expect(addErrorMessage).toHaveBeenCalledOnce();
  });

  it("termine le chargement et notifie une erreur réseau", async () => {
    findApplicationsMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const store = useEndOfLifeStore();
    await store.fetchApplications();
    expect(store.isLoading).toBe(false);
    expect(store.applications).toEqual([]);
    expect(addErrorMessage).toHaveBeenCalledOnce();
  });
});

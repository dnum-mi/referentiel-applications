import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { reactive } from "vue";
import { Roles } from "@/client/types.gen";
import GlobalStats from "./GlobalStats.vue";

const { countApplications, countCompliances, countHostings, countActors, findEndOfLife } = vi.hoisted(() => ({
  countApplications: vi.fn(),
  countCompliances: vi.fn(),
  countHostings: vi.fn(),
  countActors: vi.fn(),
  findEndOfLife: vi.fn(),
}));

const userStore = reactive({
  canListTechnologies: false,
  user: {
    id: "user-1",
    role: Roles.READER as Roles,
    scopeOrganizationId: null as string | null,
    scopeOrganization: null as { path: string } | null,
  },
});

vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));
vi.mock("@/stores/statisticsStore", () => ({ useStatisticsStore: () => ({ totalApplications: 50, countApplications, countCompliances }) }));
vi.mock("@/stores/hostingStore", () => ({ useHostingStore: () => ({ countHostings }) }));
vi.mock("@/api/index", () => ({
  default: { actorControllerCountAllActors: countActors, endOfLifeControllerFindEndOfLifeApplications: findEndOfLife },
}));

const response = (total: number) => ({ response: { ok: true }, data: { total } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function renderStats() {
  return render(GlobalStats, { global: { stubs: { DsfrHighlight: { template: "<p><slot /></p>" } } } });
}

describe("GlobalStats — compteur des fins de vie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userStore.canListTechnologies = false;
    userStore.user = { id: "user-1", role: Roles.READER, scopeOrganizationId: null, scopeOrganization: null };
    countApplications.mockResolvedValue(undefined);
    countCompliances.mockResolvedValue(7);
    countHostings.mockResolvedValue(8);
    countActors.mockResolvedValue({ data: 9 });
    findEndOfLife.mockReset().mockResolvedValue(response(3));
  });
  afterEach(cleanup);

  it("conserve les autres statistiques sans appeler ni afficher les technologies non autorisées", async () => {
    renderStats();
    await screen.findByText("Nombre d'hébergements : 8");
    const stats = screen.getByTestId("global-stats-data");
    expect(stats).toHaveTextContent("Nombre d'applications : 50");
    expect(stats).toHaveTextContent("Nombre d'acteurs : 9");
    expect(stats).toHaveTextContent("Nombre de conformités : 7");
    expect(stats).toHaveTextContent("Nombre d'hébergements : 8");
    expect(stats).not.toHaveTextContent("fin de vie");
    expect(findEndOfLife).not.toHaveBeenCalled();
  });

  it("compte les fins de vie avec le filtre API historique pour un utilisateur autorisé", async () => {
    userStore.canListTechnologies = true;
    renderStats();
    expect(await screen.findByText("Applications concernées par une fin de vie dans votre périmètre : 3")).toBeInTheDocument();
    expect(findEndOfLife).toHaveBeenCalledExactlyOnceWith({ query: { page: 0, pageSize: 1 } });
  });

  it("masque le compteur au retrait de la capacité et ignore la réponse en cours", async () => {
    const stale = deferred<ReturnType<typeof response>>();
    findEndOfLife.mockReturnValueOnce(stale.promise);
    userStore.canListTechnologies = true;
    renderStats();
    await screen.findByTestId("global-stats-data");

    userStore.canListTechnologies = false;
    stale.resolve(response(99));
    await flushPromises();
    expect(screen.getByTestId("global-stats-data")).not.toHaveTextContent("fin de vie");

    findEndOfLife.mockResolvedValueOnce(response(2));
    userStore.canListTechnologies = true;
    expect(await screen.findByText("Applications concernées par une fin de vie dans votre périmètre : 2")).toBeInTheDocument();
    expect(findEndOfLife).toHaveBeenCalledTimes(2);
  });

  it.each(["identité", "rôle", "périmètre"])("purge le compteur et ignore la réponse précédente au changement de %s", async (change) => {
    const stale = deferred<ReturnType<typeof response>>();
    const current = deferred<ReturnType<typeof response>>();
    findEndOfLife.mockResolvedValueOnce(response(3)).mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise);
    userStore.canListTechnologies = true;
    renderStats();
    await screen.findByText("Applications concernées par une fin de vie dans votre périmètre : 3");

    userStore.user.id = "intermediate-user";
    if (change === "identité") userStore.user.id = "user-2";
    if (change === "rôle") userStore.user.role = Roles.ADMIN;
    if (change === "périmètre") {
      userStore.user = { ...userStore.user, scopeOrganizationId: "org-2", scopeOrganization: { path: "MI/DNUM" } };
    }

    await waitFor(() => expect(screen.getByTestId("global-stats-data")).not.toHaveTextContent("périmètre : 3"));
    current.resolve(response(2));
    await screen.findByText("Applications concernées par une fin de vie dans votre périmètre : 2");
    stale.resolve(response(99));
    await flushPromises();
    expect(screen.getByText("Applications concernées par une fin de vie dans votre périmètre : 2")).toBeInTheDocument();
    expect(screen.getByTestId("global-stats-data")).not.toHaveTextContent("99");
  });

  it.each([
    ["HTTP", () => findEndOfLife.mockResolvedValueOnce({ response: { ok: false }, error: {} })],
    ["réseau rejetée", () => findEndOfLife.mockRejectedValueOnce(new TypeError("Failed to fetch"))],
    ["réseau sans réponse HTTP", () => findEndOfLife.mockResolvedValueOnce({ error: new TypeError("Failed to fetch") })],
    [
      "de décodage après HTTP 200",
      () => findEndOfLife.mockResolvedValueOnce({ response: { ok: true }, error: new SyntaxError("Invalid JSON") }),
    ],
  ] as const)("n'affiche pas un faux zéro après une erreur %s", async (_failure, failRequest) => {
    userStore.canListTechnologies = true;
    failRequest();
    renderStats();

    expect(await screen.findByText("Applications concernées par une fin de vie dans votre périmètre : indisponible")).toBeInTheDocument();
    expect(screen.getByTestId("global-stats-data")).toHaveTextContent("Nombre d'applications : 50");
    expect(screen.queryByTestId("global-stats-error")).not.toBeInTheDocument();
  });
});

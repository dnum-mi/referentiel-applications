import { effectScope, nextTick } from "vue";
import { Permission, Roles, type UserWithPermissions } from "@/client/types.gen";

const { searchMock, replaceMock, routeMock, countTechnicalDebtPoints } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  replaceMock: vi.fn(),
  routeMock: { query: {} as Record<string, string> },
  countTechnicalDebtPoints: vi.fn(),
}));
const userStore = await vi.hoisted(async () => {
  const { reactive } = await import("vue");
  return reactive({ hasApplicationAccess: true, user: undefined as Partial<UserWithPermissions> | undefined });
});
vi.mock("@/api/index.js", () => ({ default: { applicationControllerSearch: searchMock } }));
vi.mock("vue-router", () => ({ useRoute: () => routeMock, useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/stores/statisticsStore", () => ({
  useStatisticsStore: () => ({ countApplications: vi.fn().mockResolvedValue(0), countTechnicalDebtPoints }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));

function searchResponse(id = "application-tech-privee") {
  const application = { id, label: "Application trouvée par sa technologie" };
  return {
    response: { ok: true },
    data: { results: [application], total: 1, technicalDebtPoints: [application], averageIq: 75 },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("useApplicationSearch — debounce partagé", () => {
  let scope: ReturnType<typeof effectScope>;
  let useApplicationSearch: typeof import("./use-application-search").useApplicationSearch;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    routeMock.query = {};
    userStore.hasApplicationAccess = true;
    userStore.user = {
      id: "reader",
      email: "reader@example.test",
      role: Roles.READER,
      permissions: [Permission.APP_READ, Permission.TECHNOLOGY_READ],
      additionalPermissions: [Permission.DATA_EXPORT, Permission.BETA_FEATURES],
      scopeOrganizationId: null,
    };
    countTechnicalDebtPoints.mockReset();
    scope = effectScope();
    ({ useApplicationSearch } = await import("./use-application-search"));
    searchMock.mockReset().mockResolvedValue({
      response: { ok: true },
      data: { results: [], total: 0, technicalDebtPoints: [], averageIq: 0 },
    });
    replaceMock.mockReset();
  });

  afterEach(() => {
    scope.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("regroupe la saisie de deux composants pendant 300 ms", async () => {
    const [first, second] = scope.run(() => [useApplicationSearch(), useApplicationSearch()])!;
    first.setFilter({ search: "ref" });
    await nextTick();
    await vi.advanceTimersByTimeAsync(200);
    second.setFilter({ label: "refapp" });
    await nextTick();
    await vi.advanceTimersByTimeAsync(299);
    expect(searchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(searchMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ query: expect.objectContaining({ search: "ref", label: "refapp" }) }),
    );
  });

  it("une pagination lance une recherche unique et annule la saisie en attente", async () => {
    const search = scope.run(() => useApplicationSearch())!;
    search.setFilter({ search: "refapp" });
    await nextTick();
    await vi.advanceTimersByTimeAsync(100);
    search.setFilter({ page: 2 });
    search.setOrder(false);
    await nextTick();
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ page: 2, order: "desc" }) }));
    await vi.advanceTimersByTimeAsync(300);
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it("conserve la page demandée lorsque seule la pagination change, avec des filtres de statut et de relation actifs", async () => {
    routeMock.query = {
      page: "3",
      search: "refapp",
      currentStatus__in: "in_production",
      relationAppId: "reference-application",
      is_part_of: "INCLUDE",
    };
    const search = scope.run(() => useApplicationSearch())!;
    search.page.value = 2;
    await nextTick();
    expect(search.filters.value.page).toBe(2);
    expect(searchMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        query: expect.objectContaining({
          page: 2,
          search: "refapp",
          currentStatus__in: ["in_production"],
          relationAppId: "reference-application",
          is_part_of: "INCLUDE",
        }),
      }),
    );
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith({
      query: expect.objectContaining({
        page: "2",
        search: "refapp",
        currentStatus__in: "in_production",
        relationAppId: "reference-application",
        is_part_of: "INCLUDE",
      }),
    });
  });

  it("la réinitialisation remplace la recherche différée", async () => {
    const search = scope.run(() => useApplicationSearch())!;
    search.setFilter({ search: "à effacer" });
    await nextTick();
    search.resetFilters();
    await nextTick();
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0][0].query.search).toBeUndefined();
    await vi.advanceTimersByTimeAsync(300);
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["eol", "eol-soon", "eoas-passed"] as const)("rétablit le filtre technologies %s depuis l'URL", async (status) => {
    routeMock.query = { technologyEolStatus: status };
    const search = scope.run(() => useApplicationSearch())!;
    expect(search.filters.value.technologyEolStatus).toBe(status);
    await search.searchApplications();
    expect(searchMock).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ technologyEolStatus: status }) }));
  });

  it("envoie immédiatement le filtre technologies et le conserve dans l'URL", async () => {
    const search = scope.run(() => useApplicationSearch())!;
    search.setFilter({ technologyEolStatus: "eol", page: 0 });
    await nextTick();
    expect(replaceMock).toHaveBeenCalledWith({ query: { technologyEolStatus: "eol" } });
    expect(searchMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ query: expect.objectContaining({ technologyEolStatus: "eol" }) }),
    );
  });

  it("retire le filtre technologies de l'URL et de l'API lors de la réinitialisation", async () => {
    routeMock.query = { technologyEolStatus: "eol" };
    const search = scope.run(() => useApplicationSearch())!;
    search.resetFilters();
    await nextTick();
    expect(search.filters.value.technologyEolStatus).toBeUndefined();
    expect(replaceMock).toHaveBeenCalledWith({ query: {} });
    expect(searchMock.mock.calls[0][0].query).not.toHaveProperty("technologyEolStatus");
  });

  it("omet le filtre technologies quand « Tous les statuts » est sélectionné", async () => {
    routeMock.query = { technologyEolStatus: "eol" };
    const search = scope.run(() => useApplicationSearch())!;
    search.setFilter({ technologyEolStatus: undefined, page: 0 });
    await nextTick();
    expect(replaceMock).toHaveBeenCalledWith({ query: {} });
    expect(searchMock.mock.calls[0][0].query).not.toHaveProperty("technologyEolStatus");
  });

  it("ignore un statut technologies invalide dans l'URL", () => {
    routeMock.query = { technologyEolStatus: "all" };
    const search = scope.run(() => useApplicationSearch())!;
    expect(search.filters.value.technologyEolStatus).toBeUndefined();
  });

  it.each([
    [
      "identité",
      () => {
        userStore.user!.id = "other-reader";
      },
    ],
    [
      "rôle",
      () => {
        userStore.user!.role = Roles.VISITOR;
      },
    ],
    [
      "périmètre",
      () => {
        userStore.user!.scopeOrganizationId = "restricted-scope";
      },
    ],
    [
      "permission",
      () => {
        userStore.user!.permissions = [Permission.APP_READ];
      },
    ],
    [
      "déconnexion",
      () => {
        userStore.hasApplicationAccess = false;
      },
    ],
  ] as const)("retire les résultats et les comptes dès un changement de %s sans perdre les filtres", async (_name, changeAccess) => {
    routeMock.query = { search: "technologie privée", page: "2" };
    const [search, second] = scope.run(() => [useApplicationSearch(), useApplicationSearch()])!;
    searchMock.mockResolvedValueOnce(searchResponse());
    await search.searchApplications();
    expect(search.total.value).toBe(1);
    const filters = { ...search.filters.value };

    changeAccess();

    expect(search.results.value).toEqual([]);
    expect(second.results.value).toEqual([]);
    expect(search.technicalDebtPoints.value).toEqual([]);
    expect(search.total.value).toBe(0);
    expect(search.averageIq.value).toBe(0);
    expect(countTechnicalDebtPoints).toHaveBeenLastCalledWith(0);
    expect(search.filters.value).toEqual(filters);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it.each([true, false])("rejette la réponse de l'ancien contexte, recherche stockée = %s", async (store) => {
    const search = scope.run(() => useApplicationSearch())!;
    const stale = deferred<ReturnType<typeof searchResponse>>();
    searchMock.mockReturnValueOnce(stale.promise);
    const previousSearch = search.searchApplications({ qPrefix: "technologie" }, store, false);
    const rejection = expect(previousSearch).rejects.toThrow("Le contexte d'accès à la recherche a changé.");

    userStore.user!.permissions = [Permission.APP_READ];
    searchMock.mockResolvedValueOnce(searchResponse("application-publique"));
    await search.searchApplications();
    stale.resolve(searchResponse());
    await rejection;

    expect(search.results.value.map(({ id }) => id)).toEqual(["application-publique"]);
    expect(search.total.value).toBe(1);
    expect(search.error.value).toBeNull();
    expect(search.isLoading.value).toBe(false);
  });

  it("invalide le retrait d'une permission explicite même si elle figure aussi dans les permissions du rôle", async () => {
    userStore.user!.additionalPermissions = [Permission.TECHNOLOGY_READ];
    const search = scope.run(() => useApplicationSearch())!;
    searchMock.mockResolvedValueOnce(searchResponse());
    await search.searchApplications();

    userStore.user!.additionalPermissions = [];

    expect(search.results.value).toEqual([]);
    expect(search.total.value).toBe(0);
  });

  it("annule la recherche différée lors du retrait des droits et conserve le texte saisi", async () => {
    const search = scope.run(() => useApplicationSearch())!;
    search.setFilter({ search: "technologie" });
    await nextTick();
    await vi.advanceTimersByTimeAsync(100);

    userStore.user!.permissions = [Permission.APP_READ];
    await vi.advanceTimersByTimeAsync(300);

    expect(searchMock).not.toHaveBeenCalled();
    expect(search.filters.value.search).toBe("technologie");
  });

  it("conserve les résultats et la réponse en cours quand le renouvellement ne change pas les droits", async () => {
    routeMock.query = { search: "technologie" };
    const search = scope.run(() => useApplicationSearch())!;
    searchMock.mockResolvedValueOnce(searchResponse());
    await search.searchApplications();
    const results = search.results.value;
    const pending = deferred<ReturnType<typeof searchResponse>>();
    searchMock.mockReturnValueOnce(pending.promise);
    const currentSearch = search.searchApplications();

    userStore.user = {
      ...userStore.user,
      permissions: [...userStore.user!.permissions!].reverse(),
      additionalPermissions: [...userStore.user!.additionalPermissions!].reverse(),
      emailNotificationsEnabled: true,
    };

    expect(search.results.value).toBe(results);
    expect(search.total.value).toBe(1);
    expect(search.filters.value.search).toBe("technologie");
    pending.resolve(searchResponse("résultat-actualisé"));
    await expect(currentSearch).resolves.toMatchObject({ results: [{ id: "résultat-actualisé" }] });
    expect(search.results.value[0].id).toBe("résultat-actualisé");
  });
});

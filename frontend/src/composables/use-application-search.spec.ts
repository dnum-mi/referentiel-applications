import { effectScope, nextTick } from "vue";

const { searchMock, replaceMock } = vi.hoisted(() => ({ searchMock: vi.fn(), replaceMock: vi.fn() }));
vi.mock("@/api/index.js", () => ({ default: { applicationControllerSearch: searchMock } }));
vi.mock("vue-router", () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/stores/statisticsStore", () => ({
  useStatisticsStore: () => ({ countApplications: vi.fn().mockResolvedValue(0), countTechnicalDebtPoints: vi.fn() }),
}));

describe("useApplicationSearch — debounce partagé", () => {
  let scope: ReturnType<typeof effectScope>;
  let useApplicationSearch: typeof import("./use-application-search").useApplicationSearch;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
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
});

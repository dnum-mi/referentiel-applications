import { shallowMount, type VueWrapper } from "@vue/test-utils";
import { effectScope, nextTick } from "vue";
import { NEUTRAL_RELATION_FILTERS } from "@/types/relation-type-filter";

const { searchMock, findOneMock, replaceMock, routeMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  findOneMock: vi.fn(),
  replaceMock: vi.fn(),
  routeMock: { query: {} as Record<string, string> },
}));
vi.mock("@/api/index.js", () => ({ default: { applicationControllerSearch: searchMock, applicationControllerFindOne: findOneMock } }));
vi.mock("@/api", () => ({ default: { applicationControllerSearch: searchMock, applicationControllerFindOne: findOneMock } }));
vi.mock("vue-router", () => ({ useRoute: () => routeMock, useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/stores/statisticsStore", () => ({
  useStatisticsStore: () => ({ countApplications: vi.fn().mockResolvedValue(0), countTechnicalDebtPoints: vi.fn() }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasApplicationAccess: true }) }));

describe("RelationFilter — pagination de la recherche", () => {
  let wrapper: VueWrapper;
  let scope: ReturnType<typeof effectScope>;
  let search: ReturnType<typeof import("@/composables/use-application-search").useApplicationSearch>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    routeMock.query = {
      page: "3",
      pageSize: "30",
      search: "refapp",
      order: "desc",
      currentStatus__in: "in_production",
      currentStatus__isNull: "false",
      section: "catalogue",
    };
    searchMock.mockReset().mockResolvedValue({
      response: { ok: true },
      data: { results: [], total: 0, technicalDebtPoints: [], averageIq: 0 },
    });
    findOneMock.mockReset().mockResolvedValue({ data: { label: "Application de référence" } });
    replaceMock.mockReset();
    const { useApplicationSearch } = await import("@/composables/use-application-search");
    scope = effectScope();
    search = scope.run(() => useApplicationSearch())!;
    const { default: RelationFilter } = await import("./RelationFilter.vue");
    wrapper = shallowMount(RelationFilter);
  });

  afterEach(() => {
    wrapper?.unmount();
    scope?.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  function expectFirstPage() {
    expect(search.filters.value.page).toBe(0);
    expect(searchMock).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        query: expect.objectContaining({
          page: 0,
          pageSize: 30,
          search: "refapp",
          order: "desc",
          currentStatus__in: ["in_production"],
          currentStatus__isNull: false,
        }),
      }),
    );
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith({
      query: expect.objectContaining({
        pageSize: "30",
        search: "refapp",
        order: "desc",
        currentStatus__in: "in_production",
        currentStatus__isNull: "false",
        section: "catalogue",
      }),
    });
    expect(replaceMock.mock.calls[0][0].query).not.toHaveProperty("page");
  }

  it("affiche les suggestions depuis leur première page sans modifier le catalogue ni son URL", async () => {
    search.setFilter({ relationAppId: "reference-application", is_part_of: "INCLUDE", is_mediation_service: "EXCLUDE" });
    await nextTick();
    wrapper.unmount();
    const { default: RelationFilter } = await import("./RelationFilter.vue");
    wrapper = shallowMount(RelationFilter, { global: { stubs: { SuggestionsInput: false } } });
    await nextTick();
    const initialFilters = { ...search.filters.value };
    const initialQuery = { ...routeMock.query };
    const initialResults = search.results.value;
    const suggestions = [{ id: "precise-application", label: "Application précise" }];
    searchMock.mockReset().mockImplementation(({ query }: { query: { page?: number } }) =>
      Promise.resolve({
        response: { ok: true },
        data: { results: query.page === 0 ? suggestions : [], total: 1, technicalDebtPoints: [], averageIq: 0 },
      }),
    );
    replaceMock.mockClear();
    const input = wrapper.findComponent({ name: "SuggestionsInput" });
    expect(input.props("searchDataFunction")).toEqual(expect.any(Function));
    await input.get("input").setValue("Application précise");
    await vi.advanceTimersByTimeAsync(300);

    expect(searchMock).toHaveBeenCalledExactlyOnceWith({
      query: expect.objectContaining({ page: 0, pageSize: 10, search: "Application précise", ...NEUTRAL_RELATION_FILTERS }),
    });
    expect(searchMock.mock.calls[0][0].query).not.toHaveProperty("relationAppId");
    expect(input.get('[role="option"]').text()).toBe("Application précise");
    expect(search.filters.value).toEqual(initialFilters);
    expect(search.filters.value.page).toBe(3);
    expect(search.results.value).toBe(initialResults);
    expect(routeMock.query).toEqual(initialQuery);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it.each([
    ["sélectionne", undefined, { id: "new-reference", label: "Nouvelle application" }],
    ["remplace", "old-reference", { id: "new-reference", label: "Nouvelle application" }],
    ["efface", "old-reference", undefined],
  ] as const)("%s l'application de référence et revient à la première page", async (_label, previousId, application) => {
    search.setFilter({ relationAppId: previousId, is_part_of: "INCLUDE" });
    await nextTick();
    searchMock.mockClear();
    replaceMock.mockClear();
    wrapper.findComponent({ name: "SuggestionsInput" }).vm.$emit("update:selectedValue", application);
    await nextTick();
    expectFirstPage();
    expect(search.filters.value.relationAppId).toBe(application?.id);
    expect(searchMock.mock.calls[0][0].query.is_part_of).toBe("INCLUDE");
    if (application) {
      expect(searchMock.mock.calls[0][0].query.relationAppId).toBe(application.id);
      expect(replaceMock.mock.calls[0][0].query.relationAppId).toBe(application.id);
    } else {
      expect(searchMock.mock.calls[0][0].query).not.toHaveProperty("relationAppId");
      expect(replaceMock.mock.calls[0][0].query).not.toHaveProperty("relationAppId");
    }
  });

  it.each([
    ["is_part_of", "relation-is_part_of-select"],
    ["in_replacement_of", "relation-in_replacement_of-select"],
    ["is_service_user_of", "relation-is_service_user_of-select"],
    ["is_data_user_of", "relation-is_data_user_of-select"],
    ["use_sso_of", "relation-use_sso_of-select"],
    ["is_correlated_with", "relation-is_correlated_with-select"],
    ["is_mediation_service", "relation-mediation-service-select"],
  ] as const)("applique Inclure, Exclure et Neutre pour %s depuis une page avancée", async (field, testId) => {
    for (const mode of ["INCLUDE", "EXCLUDE", "NEUTRAL"] as const) {
      search.setFilter({ page: 3, relationAppId: "reference-application" });
      await nextTick();
      searchMock.mockClear();
      replaceMock.mockClear();
      const select = wrapper.findAllComponents({ name: "DsfrSelect" }).find((component) => component.attributes("data-testid") === testId);
      expect(select).toBeDefined();
      if (!select) throw new Error(`Filtre de relation introuvable : ${testId}`);
      select.vm.$emit("update:modelValue", mode);
      await nextTick();
      expectFirstPage();
      expect(searchMock.mock.calls[0][0].query[field]).toBe(mode);
      expect(searchMock.mock.calls[0][0].query.relationAppId).toBe("reference-application");
      if (mode === "NEUTRAL") {
        expect(replaceMock.mock.calls[0][0].query).not.toHaveProperty(field);
      } else {
        expect(replaceMock.mock.calls[0][0].query[field]).toBe(mode);
      }
    }
  });
});

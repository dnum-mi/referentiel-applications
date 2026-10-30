import { shallowMount, type VueWrapper } from "@vue/test-utils";
import { effectScope, nextTick } from "vue";
import type { ApplicationStatus } from "@/client/types.gen";

const { searchMock, replaceMock, routeMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  replaceMock: vi.fn(),
  routeMock: { query: {} as Record<string, string> },
}));
vi.mock("@/api/index.js", () => ({ default: { applicationControllerSearch: searchMock } }));
vi.mock("vue-router", () => ({ useRoute: () => routeMock, useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/stores/statisticsStore", () => ({
  useStatisticsStore: () => ({ countApplications: vi.fn().mockResolvedValue(0), countTechnicalDebtPoints: vi.fn() }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasApplicationAccess: true }) }));

describe("StatusFilter — pagination de la recherche", () => {
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
      relationAppId: "reference-application",
      section: "catalogue",
    };
    searchMock.mockReset().mockResolvedValue({
      response: { ok: true },
      data: { results: [], total: 0, technicalDebtPoints: [], averageIq: 0 },
    });
    replaceMock.mockReset();
    const { useApplicationSearch } = await import("@/composables/use-application-search");
    scope = effectScope();
    search = scope.run(() => useApplicationSearch())!;
    const { default: StatusFilter } = await import("./StatusFilter.vue");
    wrapper = shallowMount(StatusFilter);
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
        query: expect.objectContaining({ page: 0, pageSize: 30, search: "refapp", order: "desc", relationAppId: "reference-application" }),
      }),
    );
    expect(replaceMock).toHaveBeenCalledExactlyOnceWith({
      query: expect.objectContaining({
        pageSize: "30",
        search: "refapp",
        order: "desc",
        relationAppId: "reference-application",
        section: "catalogue",
      }),
    });
    expect(replaceMock.mock.calls[0][0].query).not.toHaveProperty("page");
  }

  it.each<[string, ApplicationStatus[]]>([
    ["ajoute un statut", ["in_production", "under_construction"]],
    ["remplace les statuts sélectionnés", ["under_construction"]],
    ["vide les statuts sélectionnés", []],
  ])("%s et revient à la première page", async (_label, statuses) => {
    wrapper.findComponent({ name: "DsfrCheckboxSet" }).vm.$emit("update:modelValue", statuses);
    await nextTick();
    expectFirstPage();
    if (statuses.length > 0) {
      expect(search.filters.value.currentStatus__in).toEqual(statuses);
      expect(searchMock.mock.calls[0][0].query.currentStatus__in).toEqual(statuses);
      expect(search.filters.value.currentStatus__isNull).toBe(false);
    } else {
      expect(search.filters.value.currentStatus__in).toBeUndefined();
      expect(searchMock.mock.calls[0][0].query).not.toHaveProperty("currentStatus__in");
      expect(search.filters.value.currentStatus__isNull).toBe(true);
    }
  });

  it("retire un statut parmi plusieurs et revient à la première page", async () => {
    search.setFilter({ currentStatus__in: ["in_production", "under_construction"] });
    await nextTick();
    searchMock.mockClear();
    replaceMock.mockClear();
    wrapper.findComponent({ name: "DsfrCheckboxSet" }).vm.$emit("update:modelValue", ["in_production"]);
    await nextTick();
    expectFirstPage();
    expect(searchMock.mock.calls[0][0].query.currentStatus__in).toEqual(["in_production"]);
  });

  it.each([true, false])("bascule Sans statut vers %s et revient à la première page", async (included) => {
    search.setFilter({ currentStatus__isNull: !included });
    await nextTick();
    searchMock.mockClear();
    replaceMock.mockClear();
    wrapper.findComponent({ name: "DsfrCheckbox" }).vm.$emit("update:modelValue", included ? [true] : []);
    await nextTick();
    expectFirstPage();
    expect(searchMock.mock.calls[0][0].query).toMatchObject({ currentStatus__isNull: included, currentStatus__in: ["in_production"] });
  });
});

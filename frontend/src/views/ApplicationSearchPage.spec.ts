import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ApplicationSearchPage from "./ApplicationSearchPage.vue";

const state = await vi.hoisted(async () => {
  const { ref } = await import("vue");
  return {
    isLoading: ref(false),
    total: ref(45),
    page: ref(0),
    pageSize: ref(15),
    averageIq: ref(60),
    error: ref<string | null>(null),
    searchApplications: vi.fn().mockResolvedValue(undefined),
  };
});
vi.mock("@/composables/use-application-search", () => ({ useApplicationSearch: () => state }));
vi.mock("@/stores/statisticsStore", () => ({ useStatisticsStore: () => ({ countApplications: vi.fn() }) }));
vi.mock("@/components/ApplicationCardView.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/ApplicationSearchActions.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/ApplicationTableView.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/search/SidebarFilter.vue", () => ({ default: { template: "<div />" } }));
enableAutoUnmount(afterEach);

it("annonce le chargement puis le nombre de résultats sans relire toute la table", async () => {
  const wrapper = mount(ApplicationSearchPage, {
    global: {
      stubs: {
        AppLoader: true,
        ApplicationCardView: true,
        ApplicationSearchActions: true,
        ApplicationTableView: true,
        SidebarFilters: true,
      },
    },
  });
  const status = wrapper.get('[data-testid="application-results-status"]');
  expect(status.element).toHaveAttribute("aria-live", "polite");
  expect(status.text()).toBe("45 applications trouvées. Page 1 sur 3.");
  expect(wrapper.get("#application-results").attributes("aria-live")).toBeUndefined();
  state.isLoading.value = true;
  await nextTick();
  expect(status.text()).toBe("Chargement des résultats…");
  expect(status.element.closest('[aria-busy="true"]')).toBeNull();
  state.page.value = 1;
  state.isLoading.value = false;
  await nextTick();
  expect(status.text()).toBe("45 applications trouvées. Page 2 sur 3.");
  state.total.value = 1;
  state.isLoading.value = false;
  await nextTick();
  expect(status.text()).toBe("1 application trouvée. Page 1 sur 1.");
  state.error.value = "La requête a été refusée";
  await nextTick();
  expect(status.text()).toBe("La recherche a échoué. Les résultats n’ont pas été actualisés.");
});

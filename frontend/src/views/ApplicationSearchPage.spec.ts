import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { Permission, Roles, type UserWithPermissions } from "@/client/types.gen";
import ApplicationSearchPage from "./ApplicationSearchPage.vue";

const state = await vi.hoisted(async () => {
  const { ref, reactive } = await import("vue");
  return {
    isLoading: ref(false),
    total: ref(45),
    page: ref(0),
    pageSize: ref(15),
    averageIq: ref(60),
    error: ref<string | null>(null),
    searchApplications: vi.fn().mockResolvedValue(undefined),
    userStore: reactive({ hasApplicationAccess: true, user: undefined as Partial<UserWithPermissions> | undefined }),
  };
});
vi.mock("@/composables/use-application-search", () => ({ useApplicationSearch: () => state }));
vi.mock("@/stores/statisticsStore", () => ({ useStatisticsStore: () => ({ countApplications: vi.fn() }) }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => state.userStore }));
vi.mock("@/components/ApplicationCardView.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/ApplicationSearchActions.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/ApplicationTableView.vue", () => ({ default: { template: "<div />" } }));
vi.mock("@/components/search/SidebarFilter.vue", () => ({ default: { template: "<div />" } }));
enableAutoUnmount(afterEach);

beforeEach(() => {
  state.searchApplications.mockClear();
  state.userStore.hasApplicationAccess = true;
  state.userStore.user = {
    id: "reader",
    role: Roles.READER,
    permissions: [Permission.TECHNOLOGY_READ],
    additionalPermissions: [],
    scopeOrganizationId: null,
  };
});

function mountPage() {
  return mount(ApplicationSearchPage, { global: { stubs: { AppLoader: true, SidebarFilters: true } } });
}

it("relance une seule recherche après changement des droits sur la page déjà montée", async () => {
  const wrapper = mountPage();
  expect(state.searchApplications).toHaveBeenCalledOnce();
  state.searchApplications.mockClear();
  const page = wrapper.get('[data-testid="application-view"]').element;

  state.userStore.user!.role = Roles.VISITOR;
  state.userStore.user!.permissions = [];
  state.userStore.user!.scopeOrganizationId = "restricted-scope";
  await nextTick();

  expect(state.searchApplications).toHaveBeenCalledExactlyOnceWith();
  expect(wrapper.get('[data-testid="application-view"]').element).toBe(page);
});

it("ne relance pas la recherche après un renouvellement identique ni après perte d'accès", async () => {
  mountPage();
  state.searchApplications.mockClear();

  state.userStore.user = { ...state.userStore.user, emailNotificationsEnabled: true };
  await nextTick();
  expect(state.searchApplications).not.toHaveBeenCalled();

  state.userStore.hasApplicationAccess = false;
  await nextTick();
  expect(state.searchApplications).not.toHaveBeenCalled();
});

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

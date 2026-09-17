import { flushPromises, shallowMount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import AdminActorsTab from "./AdminActorsTab.vue";
import AdminBusinessDivisionsTab from "./AdminBusinessDivisionsTab.vue";
import AdminLabelSourcesTab from "./AdminLabelSourcesTab.vue";
import AdminOrganizationsTab from "./AdminOrganizationsTab.vue";
import AdminTagsTab from "./AdminTagsTab.vue";
import AdminUsersTab from "./AdminUsersTab.vue";

const { apiMock, fetchActorTypes } = vi.hoisted(() => ({
  apiMock: {
    actorControllerFindAll: vi.fn(),
    businessDivisionControllerFindAll: vi.fn(),
    labelSourceControllerFindAll: vi.fn(),
    organizationsControllerFindAll: vi.fn(),
    tagsControllerFindAll: vi.fn(),
    userControllerFindAll: vi.fn(),
  },
  fetchActorTypes: vi.fn(),
}));

vi.mock("@/api", () => ({ default: apiMock }));
vi.mock("@/stores/actorTypeStore", () => ({
  useActorTypeStore: () => ({ actorTypes: [], fetchAll: fetchActorTypes }),
}));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({ hasPermissions: () => false }),
}));

const cases = [
  { component: AdminUsersTab, name: "users", method: "userControllerFindAll", filter: "search", sort: "email" },
  { component: AdminTagsTab, name: "tags", method: "tagsControllerFindAll", filter: "name", sort: undefined },
  { component: AdminLabelSourcesTab, name: "label-sources", method: "labelSourceControllerFindAll", filter: "source", sort: undefined },
  {
    component: AdminBusinessDivisionsTab,
    name: "business-divisions",
    method: "businessDivisionControllerFindAll",
    filter: "label",
    sort: undefined,
  },
  { component: AdminOrganizationsTab, name: "organizations", method: "organizationsControllerFindAll", filter: "search", sort: "path" },
  { component: AdminActorsTab, name: "actors", method: "actorControllerFindAll", filter: "search", sort: "email" },
] as const;

const wrappers: VueWrapper[] = [];

function mountTab(component: (typeof cases)[number]["component"]) {
  const wrapper = shallowMount(component, {
    global: {
      stubs: {
        RouterLink: true,
        RefAppTable: {
          name: "RefAppTable",
          props: ["items", "columns", "loading", "rows", "first", "totalRecords", "sortField", "sortOrder"],
          emits: ["sort", "page"],
          template: "<div />",
        },
        DsfrSearchBar: { name: "DsfrSearchBar", props: ["modelValue"], emits: ["update:modelValue"], template: "<input />" },
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  for (const method of Object.values(apiMock)) {
    method.mockReset().mockResolvedValue({ response: { ok: true }, data: { results: [], total: 0 } });
  }
  fetchActorTypes.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

describe.each(cases)("tableau admin $name", ({ component, name, method, filter, sort }) => {
  it("préserve les paramètres initiaux et annonce les résultats dans une région live", async () => {
    const wrapper = mountTab(component);
    await flushPromises();

    expect(apiMock[method]).toHaveBeenCalledExactlyOnceWith({
      query: { page: 0, pageSize: 15, sortBy: sort, order: "asc", [filter]: undefined },
    });
    const status = wrapper.get(`[data-testid="admin-${name}-status"]`);
    expect(status.attributes("aria-live")).toBe("polite");
    expect(status.attributes("aria-atomic")).toBe("true");
    expect(status.text()).toBe("Aucune donnée ne correspond à votre recherche : Résultat 0 à 0");
  });

  it("transmet la pagination et ne recharge qu'une fois lors du changement de tri", async () => {
    const wrapper = mountTab(component);
    await flushPromises();
    wrapper.findComponent({ name: "RefAppTable" }).vm.$emit("page", { page: 2, rows: 20 });
    await flushPromises();
    expect(apiMock[method]).toHaveBeenLastCalledWith({
      query: { page: 2, pageSize: 20, sortBy: sort, order: "asc", [filter]: undefined },
    });
    expect(wrapper.findComponent({ name: "RefAppTable" }).props("first")).toBe(40);
    apiMock[method].mockClear();

    wrapper.findComponent({ name: "RefAppTable" }).vm.$emit("sort", { sortField: sort ?? filter, sortOrder: -1 });
    await flushPromises();

    expect(apiMock[method]).toHaveBeenCalledExactlyOnceWith({
      query: { page: 0, pageSize: 20, sortBy: sort ?? filter, order: "desc", [filter]: undefined },
    });
  });

  it("conserve le filtre propre à l'onglet et attend 300 ms avant de revenir en première page", async () => {
    const wrapper = mountTab(component);
    await flushPromises();
    wrapper.findComponent({ name: "RefAppTable" }).vm.$emit("page", { page: 3, rows: 20 });
    await flushPromises();
    apiMock[method].mockClear();

    wrapper.findComponent({ name: "DsfrSearchBar" }).vm.$emit("update:modelValue", "nouvelle recherche");
    await nextTick();
    await vi.advanceTimersByTimeAsync(299);
    expect(apiMock[method]).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(apiMock[method]).toHaveBeenCalledExactlyOnceWith({
      query: { page: 0, pageSize: 20, sortBy: sort, order: "asc", [filter]: "nouvelle recherche" },
    });
  });
});

it("garde la même table utilisateurs pendant une actualisation puis une erreur (#1830)", async () => {
  const wrapper = mountTab(AdminUsersTab);
  await flushPromises();
  const table = wrapper.findComponent({ name: "RefAppTable" }).vm;
  let rejectRequest!: (reason: unknown) => void;
  apiMock.userControllerFindAll.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
  );

  table.$emit("page", { page: 1, rows: 15 });
  await nextTick();
  expect(wrapper.findComponent({ name: "RefAppTable" }).vm).toBe(table);
  expect(wrapper.findComponent({ name: "RefAppTable" }).props("loading")).toBe(true);
  expect(wrapper.get('[data-testid="admin-users-status"]').text()).toBe("Chargement des utilisateurs…");

  rejectRequest(new Error("service indisponible"));
  await flushPromises();
  expect(wrapper.findComponent({ name: "RefAppTable" }).vm).toBe(table);
  expect(wrapper.findComponent({ name: "RefAppTable" }).props("loading")).toBe(false);
  expect(wrapper.get('[data-testid="admin-users-error"]').text()).toBe("Erreur lors du chargement des utilisateurs");

  table.$emit("page", { page: 0, rows: 15 });
  await flushPromises();
  expect(wrapper.find('[data-testid="admin-users-error"]').exists()).toBe(false);
});

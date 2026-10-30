import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { Permission, Roles, type UserWithPermissions } from "@/client/types.gen";
import SearchHeader from "./SearchHeader.vue";

const { searchMock, pushMock } = vi.hoisted(() => ({ searchMock: vi.fn(), pushMock: vi.fn() }));
const userStore = await vi.hoisted(async () => {
  const { reactive } = await import("vue");
  return reactive({ hasApplicationAccess: true, user: undefined as Partial<UserWithPermissions> | undefined });
});
vi.mock("@/api/index.js", () => ({ default: { applicationControllerSearch: searchMock } }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));
vi.mock("@/stores/statisticsStore", () => ({
  useStatisticsStore: () => ({ countApplications: vi.fn().mockResolvedValue(0), countTechnicalDebtPoints: vi.fn() }),
}));
vi.mock("vue-router", () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ push: pushMock }) }));

function response(label = "Application liée à la technologie privée") {
  return {
    response: { ok: true },
    data: { results: [{ id: label, label }], total: 1, technicalDebtPoints: [], averageIq: 75 },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

let wrapper: VueWrapper;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  userStore.hasApplicationAccess = true;
  userStore.user = {
    id: "reader",
    role: Roles.READER,
    permissions: [Permission.APP_READ, Permission.TECHNOLOGY_READ],
    additionalPermissions: [Permission.DATA_EXPORT, Permission.BETA_FEATURES],
    scopeOrganizationId: null,
  };
  searchMock.mockResolvedValue(response());
  wrapper = mount(SearchHeader);
});
afterEach(() => {
  wrapper.unmount();
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function search(query = "technologie") {
  await wrapper.get("input").setValue(query);
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();
}

it("retire les suggestions déjà affichées dès le retrait du droit de lecture des technologies", async () => {
  await search();
  expect(wrapper.get('[role="option"]').text()).toContain("technologie privée");

  userStore.user!.permissions = [Permission.APP_READ];
  await nextTick();

  expect(wrapper.find('[role="option"]').exists()).toBe(false);
  expect(wrapper.get("input").element.value).toBe("");
  await wrapper.get("input").trigger("keydown", { key: "ArrowDown" });
  expect(wrapper.find('[role="option"]').exists()).toBe(false);
  expect(pushMock).not.toHaveBeenCalled();
});

it("ignore une suggestion tardive de l'ancien périmètre même sans nouvelle saisie", async () => {
  const stale = deferred<ReturnType<typeof response>>();
  searchMock.mockReturnValueOnce(stale.promise);
  await search();
  expect(searchMock).toHaveBeenCalledOnce();

  userStore.user!.scopeOrganizationId = "restricted-scope";
  await nextTick();
  stale.resolve(response());
  await flushPromises();

  expect(wrapper.find('[role="option"]').exists()).toBe(false);
  expect(wrapper.get("input").element.value).toBe("");
  expect(wrapper.get('[role="alert"]').text()).toBe("");

  searchMock.mockResolvedValueOnce(response("Application publique"));
  await search("publique");
  expect(wrapper.get('[role="option"]').text()).toBe("Application publique");
});

it("conserve le champ et ses suggestions lors d'un renouvellement avec les mêmes droits", async () => {
  await search();
  const input = wrapper.get("input").element;

  userStore.user = {
    ...userStore.user,
    permissions: [...userStore.user!.permissions!].reverse(),
    additionalPermissions: [...userStore.user!.additionalPermissions!].reverse(),
    emailNotificationsEnabled: true,
  };
  await nextTick();

  expect(wrapper.get("input").element).toBe(input);
  expect(input.value).toBe("technologie");
  expect(wrapper.get('[role="option"]').text()).toContain("technologie privée");
  expect(searchMock).toHaveBeenCalledOnce();
});

import { createPinia, setActivePinia } from "pinia";
import { computed, defineComponent, type PropType } from "vue";
import { enableAutoUnmount, flushPromises, shallowMount } from "@vue/test-utils";
import { RelationType, type RelationDto } from "@/client";
import type { ApplicationWithPerms } from "@/models/Application";
import { useRelationStore } from "@/stores/relationStore";
import RelationshipsTab from "./RelationshipsTab.vue";

const { fetchRelations, addErrorMessage, addSuccessMessage } = vi.hoisted(() => ({
  fetchRelations: vi.fn(),
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
}));
vi.mock("@/api/index", () => ({ default: { relationControllerFindAll: fetchRelations } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage, addSuccessMessage }) }));
vi.mock("@/composables/use-app-permission", () => ({ useAppPermission: () => computed(() => true) }));

type RelationsResponse = { response: { ok: boolean }; data: RelationDto[] };
function deferred() {
  let resolve!: (value: RelationsResponse) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<RelationsResponse>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function relation(applicationId: string, label: string): RelationDto {
  return {
    id: `${applicationId}-${label}`,
    applicationSourceId: applicationId,
    applicationTargetId: `${applicationId}-target`,
    sourceApplication: { id: applicationId, label: applicationId },
    targetApplication: { id: `${applicationId}-target`, label },
    type: RelationType.IS_PART_OF,
  } as RelationDto;
}
function response(applicationId: string, label: string): RelationsResponse {
  return { response: { ok: true }, data: [relation(applicationId, label)] };
}
function application(id: string) {
  return { id, label: id, myPerms: new Set() } as ApplicationWithPerms;
}
function renderTab(id = "app-a") {
  return shallowMount(RelationshipsTab, {
    props: { application: application(id) },
    global: {
      stubs: {
        RefAppTable: defineComponent({
          props: {
            items: { type: Array as PropType<{ originalRow: { id: string }; applicationCible: string }[]>, required: true },
          },
          template: '<ul><li v-for="item in items" :key="item.originalRow.id">{{ item.applicationCible }}</li></ul>',
        }),
      },
    },
  });
}
enableAutoUnmount(afterEach);
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("RelationshipsTab — navigation concurrente (#2951)", () => {
  it("charge les nouvelles props et laisse le chargement de B visible quand A termine avant lui", async () => {
    const a = deferred();
    const b = deferred();
    fetchRelations.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const wrapper = renderTab();
    await wrapper.setProps({ application: application("app-b") });
    expect(fetchRelations).toHaveBeenNthCalledWith(2, { path: { applicationId: "app-b" } });
    a.resolve(response("app-a", "Ancienne relation A"));
    await flushPromises();
    expect(wrapper.find('[data-testid="relationship-loader"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Ancienne relation A");
    b.resolve(response("app-b", "Relation courante B"));
    await flushPromises();
    expect(wrapper.find('[data-testid="relationship-loader"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Relation courante B");
    expect(wrapper.text()).not.toContain("Ancienne relation A");
  });

  it("retire les anciennes actions pendant le chargement puis l'échec de B", async () => {
    const b = deferred();
    fetchRelations.mockResolvedValueOnce(response("app-a", "Ancienne relation A")).mockReturnValueOnce(b.promise);
    const wrapper = renderTab();
    await flushPromises();
    expect(wrapper.text()).toContain("Ancienne relation A");
    await wrapper.setProps({ application: application("app-b") });
    expect(wrapper.text()).not.toContain("Ancienne relation A");
    expect(wrapper.findComponent({ name: "RefAppTable" }).exists()).toBe(false);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      b.reject(new Error("Accès refusé"));
      await flushPromises();
      expect(wrapper.find('[data-testid="relationship-loader"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="relations-empty"]').exists()).toBe(true);
      expect(wrapper.text()).not.toContain("Ancienne relation A");
      expect(addErrorMessage).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("garde le dernier contexte A après A → B → A et ignore l'échec tardif de B", async () => {
    const firstA = deferred();
    const b = deferred();
    const lastA = deferred();
    fetchRelations.mockReturnValueOnce(firstA.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(lastA.promise);
    const wrapper = renderTab();
    await wrapper.setProps({ application: application("app-b") });
    await wrapper.setProps({ application: application("app-a") });
    lastA.resolve(response("app-a", "Nouvelle relation A"));
    await flushPromises();
    firstA.resolve(response("app-a", "Ancienne relation A"));
    b.reject(new Error("Ancien refus de B"));
    await flushPromises();
    expect(wrapper.text()).toContain("Nouvelle relation A");
    expect(wrapper.text()).not.toContain("Ancienne relation A");
    expect(wrapper.find('[data-testid="relationship-loader"]').exists()).toBe(false);
    expect(addErrorMessage).not.toHaveBeenCalled();
  });

  it("purge le contexte au démontage et ignore sa réponse encore en vol", async () => {
    const pending = deferred();
    fetchRelations.mockReturnValueOnce(pending.promise);
    const wrapper = renderTab();
    wrapper.unmount();
    pending.resolve(response("app-a", "Ancienne relation"));
    await flushPromises();
    expect(useRelationStore().activeApplicationId).toBeNull();
    expect(useRelationStore().relations).toEqual([]);
    expect(addErrorMessage).not.toHaveBeenCalled();
  });

  it("ne publie pas d'erreur après démontage sans purger une nouvelle instance du même contexte", async () => {
    const first = deferred();
    const current = deferred();
    fetchRelations.mockReturnValueOnce(first.promise).mockReturnValueOnce(current.promise);
    const oldWrapper = renderTab();
    const currentWrapper = renderTab();
    oldWrapper.unmount();
    current.resolve(response("app-a", "Instance courante"));
    first.reject(new Error("Ancienne instance"));
    await flushPromises();
    expect(currentWrapper.text()).toContain("Instance courante");
    expect(useRelationStore().activeApplicationId).toBe("app-a");
    expect(addErrorMessage).not.toHaveBeenCalled();
  });
});

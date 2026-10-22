import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { reactive } from "vue";
import { Permission, RelationType, Status, type RelationDto } from "@/client";
import type { ApplicationWithPerms } from "@/models/Application";
import ApplicationPage from "./ApplicationPage.vue";

const { findRelations, fetchApplication } = vi.hoisted(() => ({ findRelations: vi.fn(), fetchApplication: vi.fn() }));
const applicationsById = reactive<Record<string, ApplicationWithPerms>>({});
vi.mock("@/api", () => ({ default: { relationControllerFindAll: findRelations } }));
vi.mock("@/router", () => ({ setPageTitle: vi.fn(), default: { push: vi.fn() } }));
vi.mock("@/stores/applicationStore", () => ({ useApplicationStore: () => ({ applicationsById, fetchApplication }) }));
vi.mock("@/stores/metadataStore", () => ({
  useMetadataStore: () => ({ metadataApplicationId: null, resetFirstAndLastMetadata: vi.fn() }),
}));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    isSubscribed: () => false,
    hasPermissions: (required: Permission[], appPerms: string[] = []) => required.some((permission) => appPerms.includes(permission)),
  }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));
// Le badge ne doit ni lire ni changer le contexte global de l'onglet Relations.
vi.mock("@/stores/relationStore", () => ({
  useRelationStore: () => {
    throw new Error("Le badge ne doit pas utiliser le cache de l'onglet Relations");
  },
}));

enableAutoUnmount(afterEach);
beforeEach(() => {
  findRelations.mockReset();
  fetchApplication.mockReset().mockResolvedValue(undefined);
  applicationsById["app-a"] = {
    id: "app-a",
    label: "Application A",
    currentStatus: { status: Status.DECOMMISSIONED },
    myPerms: new Set([Permission.APP_READ, Permission.RELATION_READ]),
  } as ApplicationWithPerms;
});

function relation(source: string, target: string): RelationDto {
  return {
    id: `${source}-${target}`,
    applicationSourceId: source,
    applicationTargetId: target,
    sourceApplication: { id: source, label: source },
    targetApplication: { id: target, label: target },
    type: RelationType.IN_REPLACEMENT_OF,
  } as RelationDto;
}

function success(data: RelationDto[]) {
  return { response: { ok: true }, data };
}

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/applications/:id", component: { template: "<div />" } }],
  });
  await router.push("/applications/app-a");
  return mount(ApplicationPage, {
    global: {
      plugins: [router],
      stubs: { ApplicationOverview: true, ApplicationProductExport: true, AppLoader: true, DsfrModal: true },
    },
  });
}

it("charge les seuls remplacements entrants de la fiche sans changer le cache de l'onglet", async () => {
  findRelations.mockResolvedValue(success([relation("Remplacement A", "app-a"), relation("app-a", "Autre application")]));
  const wrapper = await renderPage();
  await flushPromises();
  expect(findRelations).toHaveBeenCalledWith({ path: { applicationId: "app-a" } });
  expect(wrapper.findAll('[data-testid="application-replaced-by-tag"]').map((tag) => tag.text())).toEqual([
    "Remplacée par : Remplacement A",
  ]);
});

it("ignore une ancienne réponse après deux changements de statut", async () => {
  let finish!: (value: ReturnType<typeof success>) => void;
  findRelations.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  const wrapper = await renderPage();
  await flushPromises();
  applicationsById["app-a"].currentStatus = { status: Status.IN_PRODUCTION } as ApplicationWithPerms["currentStatus"];
  await flushPromises();
  findRelations.mockResolvedValueOnce(success([relation("Remplacement récent", "app-a")]));
  applicationsById["app-a"].currentStatus = { status: Status.DECOMMISSIONED } as ApplicationWithPerms["currentStatus"];
  await flushPromises();
  finish(success([relation("Ancien remplacement", "app-a")]));
  await flushPromises();
  expect(wrapper.get('[data-testid="application-replaced-by-tag"]').text()).toBe("Remplacée par : Remplacement récent");
});

it("ne lance aucune lecture après démontage pendant le chargement de la fiche", async () => {
  let finish!: () => void;
  fetchApplication.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
  const wrapper = await renderPage();
  wrapper.unmount();
  finish();
  await flushPromises();
  expect(findRelations).not.toHaveBeenCalled();
});

import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { User } from "oidc-client-ts";
import { defineComponent } from "vue";
import { FeatureId, Permission, Roles } from "@/client";
import { useUserStore } from "@/stores/userStore";
import ApplicationProductExport from "./ApplicationProductExport.vue";
import ApplicationSearchActions from "./ApplicationSearchActions.vue";

const { findMe, getUser, getConfig, oidcEvents, downloads } = vi.hoisted(() => ({
  findMe: vi.fn(),
  getUser: vi.fn(),
  getConfig: vi.fn(),
  oidcEvents: { loaded: (_user: User) => {}, unloaded: () => {} },
  downloads: { excel: vi.fn(), catalogueHtml: vi.fn(), productHtml: vi.fn(), powerpoint: vi.fn() },
}));
vi.mock("@/api/index", () => ({ default: { userControllerFindMe: (...args: unknown[]) => findMe(...args) } }));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: {
    getUser: () => getUser(),
    events: {
      addUserLoaded: (callback: (user: User) => void) => {
        oidcEvents.loaded = callback;
      },
      addUserUnloaded: (callback: () => void) => {
        oidcEvents.unloaded = callback;
      },
    },
  },
}));
vi.mock("@/services/config", () => ({ getConfig: (...args: unknown[]) => getConfig(...args) }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({
    downloadExcel: downloads.excel,
    downloadHtml: downloads.catalogueHtml,
    downloadProductHtml: downloads.productHtml,
    downloadProductPowerpoint: downloads.powerpoint,
  }),
}));
vi.mock("@/composables/use-application-search", async () => {
  const { ref } = await import("vue");
  return { useApplicationSearch: () => ({ filters: ref({ shortName: "app" }) }) };
});

const allPermissions = [Permission.DATA_EXPORT, Permission.BETA_FEATURES, Permission.APP_READ];
const registry = Object.values(FeatureId).filter((feature) => feature !== FeatureId.CATALOGUE_EXCEL_EXPORT);
const cases = [
  { label: "Excel ordinateur", testId: "application-export-btn", download: "excel" },
  { label: "Excel mobile", testId: "application-export-btn-mobile", download: "excel" },
  { label: "HTML catalogue", testId: "applications-export-html-btn", download: "catalogueHtml" },
  { label: "HTML fiche", testId: "application-export-html-btn", download: "productHtml" },
  { label: "PowerPoint", testId: "application-export-powerpoint-btn", download: "powerpoint" },
] as const;
const host = defineComponent({
  components: { ApplicationSearchActions, ApplicationProductExport },
  template: '<ApplicationSearchActions /><ApplicationProductExport application-id="app-1" />',
});
const stubs = { ReportModal: true, CreateQualityCampaignModal: true, ColumnCustomization: true, GristSyncModal: true };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });
  return { promise, resolve };
}
function session(sid = "same-session") {
  const exp = Math.floor(Date.now() / 1000) + 600;
  return new User({
    access_token: "synthetic-token",
    token_type: "Bearer",
    expires_at: exp,
    profile: { iss: "https://sso.example.test", sub: "subject", sid, aud: "refapp", iat: 1, exp },
  });
}
function accepted(permissions = allPermissions) {
  return {
    response: { ok: true, status: 200 },
    data: { id: "reader", role: Roles.READER, email: "reader@example.test", permissions, additionalPermissions: [] },
  };
}
async function mountExports() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useUserStore();
  await flushPromises();
  render(host, { global: { plugins: [pinia], stubs } });
  await flushPromises();
  return store;
}
function expectAllHidden() {
  for (const { testId } of cases) expect(screen.queryByTestId(testId)).toBeNull();
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  getUser.mockResolvedValue(session());
  findMe.mockResolvedValue(accepted());
  getConfig.mockResolvedValue({ betaFeatures: registry });
});
afterEach(() => cleanup());

it.each(cases)("conserve $label après renouvellement de la même session et permet un nouveau clic", async ({ testId, download }) => {
  const store = await mountExports();
  const stale = deferred<ReturnType<typeof accepted>>();
  const fresh = deferred<ReturnType<typeof accepted>>();
  findMe.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
  await fireEvent.click(screen.getByTestId(testId));
  oidcEvents.loaded(session());
  fresh.resolve(accepted());
  await flushPromises();
  stale.resolve(accepted());
  await flushPromises();

  expect(store.hasApplicationAccess).toBe(true);
  expect(store.hasPermissions([Permission.DATA_EXPORT])).toBe(true);
  expect(downloads[download]).not.toHaveBeenCalled();
  for (const { testId: visibleId } of cases) expect(screen.getByTestId(visibleId)).toBeInTheDocument();
  await fireEvent.click(screen.getByTestId(testId));
  await flushPromises();
  expect(downloads[download]).toHaveBeenCalledTimes(1);
});

it("ne télécharge pas sur une réponse périmée terminant avant la revalidation courante", async () => {
  const store = await mountExports();
  const stale = deferred<ReturnType<typeof accepted>>();
  const fresh = deferred<ReturnType<typeof accepted>>();
  findMe.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
  await fireEvent.click(screen.getByTestId("application-export-btn"));
  oidcEvents.loaded(session());
  stale.resolve(accepted());
  await flushPromises();
  expect(downloads.excel).not.toHaveBeenCalled();
  fresh.resolve(accepted());
  await flushPromises();
  expect(store.hasApplicationAccess).toBe(true);
  expect(screen.getByTestId("application-export-btn")).toBeInTheDocument();
  await fireEvent.click(screen.getByTestId("application-export-btn"));
  await flushPromises();
  expect(downloads.excel).toHaveBeenCalledTimes(1);
});

it.each([401, 403])("un vrai refus %s ferme tous les exports, puis une validation réussie les rétablit sans remontage", async (status) => {
  const store = await mountExports();
  findMe.mockResolvedValueOnce({ response: { ok: false, status }, error: { message: "Refus" } });
  await fireEvent.click(screen.getByTestId("application-export-btn"));
  await flushPromises();
  expectAllHidden();
  expect(downloads.excel).not.toHaveBeenCalled();
  expect(await store.fetchUser()).toBe(true);
  await flushPromises();
  for (const { testId } of cases) expect(screen.getByTestId(testId)).toBeInTheDocument();
});

it("une erreur réseau ferme les exports jusqu'à une nouvelle validation réussie", async () => {
  const store = await mountExports();
  findMe.mockRejectedValueOnce(new Error("Réseau indisponible"));
  await fireEvent.click(screen.getByTestId("application-export-btn"));
  await flushPromises();
  expectAllHidden();
  expect(downloads.excel).not.toHaveBeenCalled();
  expect(await store.fetchUser()).toBe(true);
  await flushPromises();
  for (const { testId } of cases) expect(screen.getByTestId(testId)).toBeInTheDocument();
});

it.each([
  {
    label: "DataExport",
    permissions: [Permission.APP_READ, Permission.BETA_FEATURES],
    hidden: "application-export-btn",
    visible: "application-export-html-btn",
  },
  {
    label: "BetaFeatures",
    permissions: [Permission.DATA_EXPORT, Permission.APP_READ],
    hidden: "application-export-powerpoint-btn",
    visible: "application-export-btn",
  },
])("respecte la révocation de $label pendant le renouvellement", async ({ permissions, hidden, visible }) => {
  await mountExports();
  const stale = deferred<ReturnType<typeof accepted>>();
  const fresh = deferred<ReturnType<typeof accepted>>();
  findMe.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
  await fireEvent.click(screen.getByTestId("application-export-btn"));
  oidcEvents.loaded(session());
  fresh.resolve(accepted(permissions));
  await flushPromises();
  stale.resolve(accepted());
  await flushPromises();
  expect(screen.queryByTestId(hidden)).toBeNull();
  expect(screen.getByTestId(visible)).toBeInTheDocument();
  expect(downloads.excel).not.toHaveBeenCalled();
});

it("une ancienne réponse réussie ne rouvre aucun export après déconnexion", async () => {
  await mountExports();
  const stale = deferred<ReturnType<typeof accepted>>();
  findMe.mockReturnValueOnce(stale.promise);
  await fireEvent.click(screen.getByTestId("application-export-btn"));
  oidcEvents.unloaded();
  stale.resolve(accepted());
  await flushPromises();
  expectAllHidden();
  expect(downloads.excel).not.toHaveBeenCalled();
});

it("un registre bêta indisponible reste fermé malgré une validation de session réussie", async () => {
  const store = await mountExports();
  getConfig.mockRejectedValue(new Error("Configuration indisponible"));
  await fireEvent.click(screen.getByTestId("application-export-btn"));
  await flushPromises();
  await fireEvent.click(screen.getByTestId("application-export-powerpoint-btn"));
  await flushPromises();
  expectAllHidden();
  expect(await store.fetchUser()).toBe(true);
  await flushPromises();
  expectAllHidden();
  expect(downloads.excel).not.toHaveBeenCalled();
});

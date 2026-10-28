import { cleanup, render, screen } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, ref } from "vue";
import { FeatureId, Permission } from "@/client";
import { getConfig } from "@/services/config";
import ApplicationSearchActions from "./ApplicationSearchActions.vue";
import ApplicationProductExport from "./ApplicationProductExport.vue";

const { apiGetConfig, hasPermissions } = vi.hoisted(() => ({ apiGetConfig: vi.fn(), hasPermissions: vi.fn() }));
vi.mock("@/api", () => ({ default: { getConfig: apiGetConfig } }));
vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({ hasPermissions, fetchUser: vi.fn().mockResolvedValue(true), user: {} }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn() }) }));
vi.mock("@/stores/applicationStore", () => ({ useApplicationStore: () => ({ downloadExcel: vi.fn(), downloadHtml: vi.fn() }) }));
vi.mock("@/composables/use-application-search", async () => {
  const { ref } = await import("vue");
  return { useApplicationSearch: () => ({ filters: ref({}) }) };
});

const grantedPermissions = ref<Permission[]>([Permission.DATA_EXPORT]);
const currentBetaFeatures = Object.values(FeatureId).filter((feature) => feature !== FeatureId.CATALOGUE_EXCEL_EXPORT);
const stubs = { ReportModal: true, CreateQualityCampaignModal: true, ColumnCustomization: true, GristSyncModal: true };

afterEach(() => cleanup());
beforeEach(() => {
  apiGetConfig.mockReset();
  grantedPermissions.value = [Permission.DATA_EXPORT];
  hasPermissions.mockImplementation((required: Permission[]) =>
    required.some((permission) => grantedPermissions.value.includes(permission)),
  );
});

async function primeStartupConfiguration(betaFeatures: FeatureId[] | undefined) {
  apiGetConfig.mockResolvedValueOnce({ response: { ok: true }, data: betaFeatures === undefined ? {} : { betaFeatures } });
  await getConfig({ refresh: true });
}

it.each([
  { name: "Excel encore en bêta", betaFeatures: Object.values(FeatureId) },
  { name: "registre absent de l'ancienne API", betaFeatures: undefined },
])("relit le registre au montage malgré le cache de démarrage OIDC : $name", async ({ betaFeatures }) => {
  await primeStartupConfiguration(betaFeatures);
  apiGetConfig.mockResolvedValueOnce({ response: { ok: true }, data: { betaFeatures: currentBetaFeatures } });
  render(ApplicationSearchActions, { global: { stubs } });
  await flushPromises();

  for (const testId of ["application-export-btn", "application-export-btn-mobile"]) {
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.getByTestId(testId)).not.toHaveTextContent("Bêta");
  }
  expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
  expect(apiGetConfig).toHaveBeenCalledTimes(2);
});

it("partage une seule relecture entre catalogue et fiche et garde les exports fermés jusqu'à sa réponse", async () => {
  await primeStartupConfiguration([]);
  let finish = (_value: { response: { ok: true }; data: { betaFeatures: FeatureId[] } }) => {};
  apiGetConfig.mockReturnValueOnce(
    new Promise<{ response: { ok: true }; data: { betaFeatures: FeatureId[] } }>((resolve) => {
      finish = resolve;
    }),
  );
  render(
    defineComponent({
      components: { ApplicationSearchActions, ApplicationProductExport },
      template: '<ApplicationSearchActions /><ApplicationProductExport application-id="application-1" />',
    }),
    { global: { stubs } },
  );
  await flushPromises();
  expect(screen.queryByTestId("application-export-btn")).toBeNull();
  expect(screen.queryByTestId("application-export-html-btn")).toBeNull();
  expect(screen.queryByTestId("application-export-powerpoint-btn")).toBeNull();
  expect(apiGetConfig).toHaveBeenCalledTimes(2);

  finish({ response: { ok: true }, data: { betaFeatures: currentBetaFeatures } });
  await flushPromises();
  expect(screen.getByTestId("application-export-btn")).toBeInTheDocument();
  expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
  expect(screen.queryByTestId("application-export-html-btn")).toBeNull();
  expect(screen.queryByTestId("application-export-powerpoint-btn")).toBeNull();
});

it("ne réutilise pas un registre permissif en cache si la relecture échoue", async () => {
  await primeStartupConfiguration([]);
  grantedPermissions.value = [Permission.DATA_EXPORT, Permission.BETA_FEATURES];
  apiGetConfig.mockResolvedValueOnce({ response: { ok: false, status: 503 }, error: { message: "indisponible" } });
  render(ApplicationSearchActions, { global: { stubs } });
  await flushPromises();
  expect(screen.queryByTestId("application-export-btn")).toBeNull();
  expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
  expect(apiGetConfig).toHaveBeenCalledTimes(2);
});

import { flushPromises } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { FeatureId, Permission } from "@/client";
import { useBetaFeatures } from "./use-beta-features";

const { getConfig, fetchUser, hasPermissions } = vi.hoisted(() => ({ getConfig: vi.fn(), fetchUser: vi.fn(), hasPermissions: vi.fn() }));
vi.mock("@/services/config", () => ({ getConfig }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ fetchUser, hasPermissions }) }));
const permissions = ref<Permission[]>([]);

beforeEach(() => {
  vi.resetAllMocks();
  permissions.value = [];
  hasPermissions.mockImplementation((required: Permission[]) => required.some((permission) => permissions.value.includes(permission)));
  fetchUser.mockResolvedValue(true);
  getConfig.mockResolvedValue({ betaFeatures: Object.values(FeatureId) });
});

it("reste fermé tant que le registre backend est inconnu, en erreur ou absent", async () => {
  getConfig.mockReturnValueOnce(new Promise(() => {}));
  expect(useBetaFeatures().canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(false);
  for (const config of [new Error("indisponible"), {}]) {
    getConfig.mockResolvedValueOnce(config);
    const beta = useBetaFeatures();
    await flushPromises();
    expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(false);
  }
  getConfig.mockRejectedValueOnce(new Error("réseau"));
  const beta = useBetaFeatures();
  await flushPromises();
  expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(false);
});

it("cumule la capacité bêta et chaque droit métier, avec le vrai contrat OU de hasPermissions", async () => {
  const beta = useBetaFeatures();
  await flushPromises();
  permissions.value = [Permission.DATA_EXPORT];
  expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(false);
  permissions.value = [Permission.BETA_FEATURES];
  expect(await beta.authorize(FeatureId.CATALOGUE_EXCEL_EXPORT, [Permission.DATA_EXPORT])).toBe(false);
  permissions.value.push(Permission.DATA_EXPORT);
  expect(await beta.authorize(FeatureId.CATALOGUE_EXCEL_EXPORT, [Permission.DATA_EXPORT])).toBe(true);
});

it("tient compte d'une révocation retournée par /users/me avant de démarrer l'export", async () => {
  permissions.value = [Permission.BETA_FEATURES, Permission.DATA_EXPORT];
  const beta = useBetaFeatures();
  await flushPromises();
  fetchUser.mockImplementationOnce(async () => {
    permissions.value = [Permission.DATA_EXPORT];
    return true;
  });
  expect(await beta.authorize(FeatureId.CATALOGUE_EXCEL_EXPORT, [Permission.DATA_EXPORT])).toBe(false);
  expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(false);
});

it.each([false, new Error("réseau")])("bloque si la revalidation de session échoue (%s)", async (failure) => {
  permissions.value = [Permission.BETA_FEATURES];
  const beta = useBetaFeatures();
  await flushPromises();
  if (failure instanceof Error) fetchUser.mockRejectedValueOnce(failure);
  else fetchUser.mockResolvedValueOnce(failure);
  expect(await beta.authorize(FeatureId.PRODUCT_HTML_EXPORT)).toBe(false);
  expect(beta.canAccess(FeatureId.PRODUCT_HTML_EXPORT)).toBe(false);
});

it("retire badge et restriction en retirant uniquement la fonctionnalité du registre backend", async () => {
  const config = reactive({ betaFeatures: Object.values(FeatureId) });
  getConfig.mockResolvedValue(config);
  const beta = useBetaFeatures();
  await flushPromises();
  expect(beta.isBeta(FeatureId.PRODUCT_HTML_EXPORT)).toBe(true);
  expect(beta.canAccess(FeatureId.PRODUCT_HTML_EXPORT)).toBe(false);
  config.betaFeatures.splice(config.betaFeatures.indexOf(FeatureId.PRODUCT_HTML_EXPORT), 1);
  expect(beta.isBeta(FeatureId.PRODUCT_HTML_EXPORT)).toBe(false);
  expect(beta.canAccess(FeatureId.PRODUCT_HTML_EXPORT)).toBe(true);
  expect(beta.canAccess(FeatureId.PRODUCT_POWERPOINT_EXPORT)).toBe(false);
  expect(await beta.authorize(FeatureId.PRODUCT_HTML_EXPORT)).toBe(true);
});

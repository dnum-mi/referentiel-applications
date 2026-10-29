import { flushPromises } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { FeatureId, Permission } from "@/client";
import { useBetaFeatures } from "./use-beta-features";

const { getConfig, fetchUser, hasPermissions } = vi.hoisted(() => ({ getConfig: vi.fn(), fetchUser: vi.fn(), hasPermissions: vi.fn() }));
vi.mock("@/services/config", () => ({ getConfig }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));
const permissions = ref<Permission[]>([]);
const userStore = reactive({ accessRefreshFailed: false, fetchUser, hasPermissions });

beforeEach(() => {
  vi.resetAllMocks();
  permissions.value = [];
  userStore.accessRefreshFailed = false;
  hasPermissions.mockImplementation((required: Permission[]) => required.some((permission) => permissions.value.includes(permission)));
  fetchUser.mockImplementation(async () => {
    userStore.accessRefreshFailed = false;
    return true;
  });
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
  fetchUser.mockImplementationOnce(async () => {
    userStore.accessRefreshFailed = true;
    if (failure instanceof Error) throw failure;
    return failure;
  });
  expect(await beta.authorize(FeatureId.PRODUCT_HTML_EXPORT)).toBe(false);
  expect(beta.canAccess(FeatureId.PRODUCT_HTML_EXPORT)).toBe(false);
});

it("reste fermé avant la première validation et suit son succès sans remontage", async () => {
  userStore.accessRefreshFailed = true;
  getConfig.mockResolvedValue({ betaFeatures: [] });
  const beta = useBetaFeatures();
  await flushPromises();
  expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(false);

  await fetchUser();
  expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(true);
});

it("annule un clic périmé sans verrouiller le verdict valide conservé par le store", async () => {
  permissions.value = [Permission.BETA_FEATURES, Permission.DATA_EXPORT];
  const beta = useBetaFeatures();
  await flushPromises();
  fetchUser.mockResolvedValueOnce(false);

  expect(await beta.authorize(FeatureId.CATALOGUE_EXCEL_EXPORT, [Permission.DATA_EXPORT])).toBe(false);
  expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(true);
  expect(await beta.authorize(FeatureId.CATALOGUE_EXCEL_EXPORT, [Permission.DATA_EXPORT])).toBe(true);
});

it.each([false, new Error("réseau")])(
  "retrouve les exports après une nouvelle validation réussie, sans remontage (%s)",
  async (failure) => {
    permissions.value = [Permission.BETA_FEATURES, Permission.DATA_EXPORT];
    const beta = useBetaFeatures();
    await flushPromises();
    fetchUser.mockImplementationOnce(async () => {
      userStore.accessRefreshFailed = true;
      if (failure instanceof Error) throw failure;
      return failure;
    });
    expect(await beta.authorize(FeatureId.CATALOGUE_EXCEL_EXPORT, [Permission.DATA_EXPORT])).toBe(false);
    expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(false);

    // Une autre revalidation du store peut être déclenchée par les événements OIDC.
    await fetchUser();
    expect(beta.canAccess(FeatureId.CATALOGUE_EXCEL_EXPORT)).toBe(true);
    expect(await beta.authorize(FeatureId.CATALOGUE_EXCEL_EXPORT, [Permission.DATA_EXPORT])).toBe(true);
  },
);

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

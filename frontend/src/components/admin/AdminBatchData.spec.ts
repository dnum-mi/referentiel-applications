import { enableAutoUnmount, mount, flushPromises } from "@vue/test-utils";
import AdminBatchData from "./AdminBatchData.vue";
import { FeatureId, Permission, type ImportReportDto } from "@/client";
import { reactive, ref } from "vue";

const { importExcel, syncUsers, syncActors, patchQuality, addSuccessMessage, addErrorMessage, hasPermissions, fetchUser, getConfig } =
  vi.hoisted(() => ({
    hasPermissions: vi.fn(),
    fetchUser: vi.fn(),
    getConfig: vi.fn(),
    importExcel: vi.fn(),
    syncUsers: vi.fn(),
    syncActors: vi.fn(),
    patchQuality: vi.fn(),
    addSuccessMessage: vi.fn(),
    addErrorMessage: vi.fn(),
  }));
vi.mock("@/api", () => ({
  default: {
    importControllerImportExcel: importExcel,
    userControllerSyncOrganizationsFromMaia: syncUsers,
    actorControllerSyncFromMaia: syncActors,
  },
}));
vi.mock("@/stores/applicationStore", () => ({ useApplicationStore: () => ({ patchApplicationsQuality: patchQuality }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addSuccessMessage, addErrorMessage }) }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions, fetchUser }) }));
vi.mock("@/services/config", () => ({ getConfig }));
const grantedPermissions = ref<Permission[]>([]);
enableAutoUnmount(afterEach);
beforeEach(() => {
  for (const mock of [
    importExcel,
    syncUsers,
    syncActors,
    patchQuality,
    addSuccessMessage,
    addErrorMessage,
    hasPermissions,
    fetchUser,
    getConfig,
  ])
    mock.mockReset();
  grantedPermissions.value = [Permission.GLOBAL_ADMIN_MANAGE, Permission.BETA_FEATURES];
  hasPermissions.mockImplementation((required: Permission[]) =>
    required.some((permission) => grantedPermissions.value.includes(permission)),
  );
  fetchUser.mockResolvedValue(true);
  getConfig.mockResolvedValue({ betaFeatures: Object.values(FeatureId) });
});

async function chooseFile(wrapper: ReturnType<typeof mount>) {
  const file = new File(["simulation"], "import.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const input = wrapper.get('[data-testid="admin-import-file"]');
  Object.defineProperty(input.element, "files", { configurable: true, value: [file] });
  await input.trigger("change");
  return file;
}

it("affiche les états, les deux listes d’onglets et le journal complet après un import simulé", async () => {
  const report: ImportReportDto = {
    summary: { created: 1, updated: 1, errors: 1, processedSheets: ["Applications", "Acteurs"], ignoredSheets: ["Ancien onglet"] },
    entries: [
      { sheet: "Acteurs", row: 2, status: "created", identifier: "a-1" },
      { sheet: "Acteurs", row: 3, status: "updated", identifier: "a-2" },
      { sheet: "Acteurs", row: 4, status: "error", message: "Erreur; ligne invalide" },
    ],
    logs: ["Journal; première ligne\nSuite", "Onglet ignoré <script>texte littéral</script>"],
  };
  importExcel.mockResolvedValue({ response: { ok: true, status: 200 }, data: report });
  const wrapper = mount(AdminBatchData);
  const file = new File(["simulation"], "import.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const input = wrapper.get('[data-testid="admin-import-file"]');
  Object.defineProperty(input.element, "files", { configurable: true, value: [file] });
  await input.trigger("change");
  await wrapper.get('[data-testid="admin-import-submit"]').trigger("click");
  await flushPromises();
  expect(importExcel).toHaveBeenCalledWith({ body: { file } });
  expect(wrapper.findAll('[data-testid="admin-import-processed-sheets"] li').map((item) => item.text())).toEqual(
    report.summary.processedSheets,
  );
  expect(wrapper.findAll('[data-testid="admin-import-ignored-sheets"] li').map((item) => item.text())).toEqual(
    report.summary.ignoredSheets,
  );
  expect(wrapper.findAll('[data-testid="admin-import-report-logs"] li p').map((item) => item.element.textContent)).toEqual(report.logs);
  expect(wrapper.findAll(".fr-badge").map((badge) => badge.text())).toEqual(["Créé", "Mis à jour", "Erreur", "Bêta"]);
  expect(wrapper.get('[data-testid="admin-import-report-download"]').text()).toBe("Télécharger le rapport CSV");
  expect(wrapper.get('[data-testid="admin-import-report-download-html"]').text()).toBe("Télécharger le rapport HTML Bêta");
  expect(wrapper.find("script").exists()).toBe(false);
  wrapper.unmount();
});

it("garde le bouton et le fichier pendant une erreur différée, annonce l'attente et bloque les appels concurrents", async () => {
  let resolve!: (value: { response: { ok: false }; error: { message: string } }) => void;
  importExcel.mockReturnValue(new Promise((release) => (resolve = release)));
  const wrapper = mount(AdminBatchData, { attachTo: document.body });
  const file = await chooseFile(wrapper);
  const submit = wrapper.get<HTMLButtonElement>('[data-testid="admin-import-submit"]');
  submit.element.focus();
  await submit.trigger("click");
  expect(submit.element).not.toBeDisabled();
  expect(submit.element).toHaveAttribute("aria-disabled", "true");
  expect(submit.element).toHaveFocus();
  expect(wrapper.get('[data-testid="admin-batch-progress"]').text()).toBe("Import du fichier Excel en cours…");
  await submit.trigger("click");
  await wrapper.get('[data-testid="admin-quality-recompute-btn"]').trigger("click");
  await wrapper.findAll('[data-testid="admin-users-maia-batch-btn"]')[0].trigger("click");
  await wrapper.get('[data-testid="admin-actor-maia-batch-btn"]').trigger("click");
  expect(importExcel).toHaveBeenCalledTimes(1);
  expect(patchQuality).not.toHaveBeenCalled();
  expect(syncUsers).not.toHaveBeenCalled();
  expect(syncActors).not.toHaveBeenCalled();
  resolve({ response: { ok: false }, error: { message: "Import refusé" } });
  await flushPromises();
  expect(addErrorMessage).toHaveBeenCalledExactlyOnceWith("Erreur lors de l'import du fichier Excel.");
  expect(addSuccessMessage).not.toHaveBeenCalled();
  expect(submit.element).toHaveFocus();
  expect(wrapper.get<HTMLInputElement>('[data-testid="admin-import-file"]').element.files?.[0]).toBe(file);
  expect(wrapper.find('[data-testid="admin-import-report"]').exists()).toBe(false);
  expect(wrapper.get('[data-testid="admin-batch-progress"]').text()).toBe("");
});

it("respecte un déplacement volontaire du focus pendant le refus d'import", async () => {
  let resolve!: (value: { response: { ok: false } }) => void;
  importExcel.mockReturnValue(new Promise((release) => (resolve = release)));
  const wrapper = mount(AdminBatchData, { attachTo: document.body });
  await chooseFile(wrapper);
  await wrapper.get('[data-testid="admin-import-submit"]').trigger("click");
  const fileInput = wrapper.get<HTMLInputElement>('[data-testid="admin-import-file"]').element;
  fileInput.focus();
  resolve({ response: { ok: false } });
  await flushPromises();
  expect(fileInput).toHaveFocus();
});

it.each([
  {
    name: "utilisateurs sans organisation",
    testId: "admin-users-maia-batch-btn",
    index: 0,
    apiMock: syncUsers,
    body: { onlyMissing: true },
  },
  {
    name: "utilisateurs avec organisation",
    testId: "admin-users-maia-batch-btn",
    index: 1,
    apiMock: syncUsers,
    body: { onlyMissing: false },
  },
  { name: "acteurs", testId: "admin-actor-maia-batch-btn", index: 0, apiMock: syncActors, body: undefined },
])("annonce un refus SDK du batch MAIA $name sans afficher de faux succès", async ({ testId, index, apiMock, body }) => {
  apiMock.mockResolvedValue({ response: { ok: false, status: 500 }, error: { message: "Refus MAIA" } });
  const wrapper = mount(AdminBatchData, { attachTo: document.body });
  const button = wrapper.findAll(
    testId === "admin-users-maia-batch-btn" ? '[data-testid="admin-users-maia-batch-btn"]' : '[data-testid="admin-actor-maia-batch-btn"]',
  )[index];
  (button.element as HTMLButtonElement).focus();
  await button.trigger("click");
  await flushPromises();
  expect(apiMock).toHaveBeenCalledTimes(1);
  if (body) expect(apiMock).toHaveBeenCalledWith({ body });
  expect(addErrorMessage).toHaveBeenCalledExactlyOnceWith("Erreur lors du lancement du batch MAIA.");
  expect(addSuccessMessage).not.toHaveBeenCalled();
  expect(button.element).toHaveFocus();
});

it("garde le succès du lancement MAIA lorsque le SDK confirme une réponse202", async () => {
  syncUsers.mockResolvedValue({ response: { ok: true, status: 202 } });
  const wrapper = mount(AdminBatchData);
  await wrapper.findAll('[data-testid="admin-users-maia-batch-btn"]')[1].trigger("click");
  await flushPromises();
  expect(syncUsers).toHaveBeenCalledWith({ body: { onlyMissing: false } });
  expect(addSuccessMessage).toHaveBeenCalledExactlyOnceWith("Batch MAIA lancé en tâche de fond.");
  expect(addErrorMessage).not.toHaveBeenCalled();
});

async function renderImportReport() {
  const report: ImportReportDto = {
    summary: { created: 1, updated: 0, errors: 0, processedSheets: ["Applications"], ignoredSheets: [] },
    entries: [{ sheet: "Applications", row: 2, status: "created", identifier: "app-1" }],
    logs: ["Import terminé"],
  };
  importExcel.mockResolvedValue({ response: { ok: true, status: 200 }, data: report });
  const wrapper = mount(AdminBatchData);
  await chooseFile(wrapper);
  await wrapper.get('[data-testid="admin-import-submit"]').trigger("click");
  await flushPromises();
  return wrapper;
}

describe("AdminBatchData — export HTML bêta du rapport d'import", () => {
  const createObjectURL = vi.fn((_blob: Blob) => "blob:rapport-import");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("masque HTML sans Bêta et conserve le téléchargement CSV", async () => {
    grantedPermissions.value = [Permission.GLOBAL_ADMIN_MANAGE];
    const wrapper = await renderImportReport();
    expect(wrapper.find('[data-testid="admin-import-report-download-html"]').exists()).toBe(false);
    await wrapper.get('[data-testid="admin-import-report-download"]').trigger("click");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fetchUser).not.toHaveBeenCalled();
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it("affiche le badge et recharge les capacités avant de générer HTML", async () => {
    const wrapper = await renderImportReport();
    const button = wrapper.get('[data-testid="admin-import-report-download-html"]');
    expect(button.text()).toContain("Bêta");
    expect(button.element).toHaveAccessibleName("Télécharger le rapport HTML Bêta");
    expect(button.find(".fr-badge").element.tagName).toBe("SPAN");
    await button.trigger("click");
    await flushPromises();
    expect(fetchUser).toHaveBeenCalledTimes(1);
    expect(getConfig).toHaveBeenLastCalledWith({ refresh: true });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0].type).toBe("text/html;charset=utf-8");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:rapport-import");
  });

  it.each([Permission.BETA_FEATURES, Permission.GLOBAL_ADMIN_MANAGE])(
    "ne génère pas de fichier si /users/me retire %s au clic",
    async (revoked) => {
      const wrapper = await renderImportReport();
      fetchUser.mockImplementationOnce(async () => {
        grantedPermissions.value = grantedPermissions.value.filter((permission) => permission !== revoked);
        return true;
      });
      await wrapper.get('[data-testid="admin-import-report-download-html"]').trigger("click");
      await flushPromises();
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(wrapper.find('[data-testid="admin-import-report-download-html"]').exists()).toBe(false);
    },
  );

  it("permet de sortir le rapport de bêta indépendamment des autres exports", async () => {
    const config = reactive({ betaFeatures: Object.values(FeatureId) });
    getConfig.mockResolvedValue(config);
    grantedPermissions.value = [Permission.GLOBAL_ADMIN_MANAGE];
    const wrapper = await renderImportReport();
    config.betaFeatures.splice(config.betaFeatures.indexOf(FeatureId.IMPORT_REPORT_HTML_EXPORT), 1);
    await flushPromises();
    const button = wrapper.get('[data-testid="admin-import-report-download-html"]');
    expect(button.text()).not.toContain("Bêta");
    await button.trigger("click");
    await flushPromises();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});

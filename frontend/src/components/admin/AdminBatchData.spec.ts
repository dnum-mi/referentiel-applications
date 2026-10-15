import { enableAutoUnmount, mount, flushPromises } from "@vue/test-utils";
import AdminBatchData from "./AdminBatchData.vue";
import type { ImportReportDto } from "@/client";

const { importExcel, syncUsers, syncActors, patchQuality, addSuccessMessage, addErrorMessage } = vi.hoisted(() => ({
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
enableAutoUnmount(afterEach);
beforeEach(() => {
  for (const mock of [importExcel, syncUsers, syncActors, patchQuality, addSuccessMessage, addErrorMessage]) mock.mockReset();
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
  expect(wrapper.findAll(".fr-badge").map((badge) => badge.text())).toEqual(["Créé", "Mis à jour", "Erreur"]);
  expect(wrapper.get('[data-testid="admin-import-report-download"]').text()).toBe("Télécharger le rapport CSV");
  expect(wrapper.get('[data-testid="admin-import-report-download-html"]').text()).toBe("Télécharger le rapport HTML");
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

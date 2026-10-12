import { mount, flushPromises } from "@vue/test-utils";
import AdminBatchData from "./AdminBatchData.vue";
import type { ImportReportDto } from "@/client";

const { importExcel } = vi.hoisted(() => ({ importExcel: vi.fn() }));
vi.mock("@/api", () => ({ default: { importControllerImportExcel: importExcel } }));
vi.mock("@/stores/applicationStore", () => ({ useApplicationStore: () => ({ patchApplicationsQuality: vi.fn() }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addSuccessMessage: vi.fn(), addErrorMessage: vi.fn() }) }));

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
  importExcel.mockResolvedValue({ data: report });
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

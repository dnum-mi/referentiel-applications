import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { computed } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import LabelModal from "../label/LabelModal.vue";
import ComplianceForm from "../compliances/ComplianceForm.vue";
import LinkForm from "./LinkForm.vue";

const mocks = vi.hoisted(() => ({ sources: vi.fn(), save: vi.fn(), toast: vi.fn() }));
vi.mock("@/api/index", () => ({
  default: {
    labelSourceControllerFindAll: mocks.sources,
    labelsControllerCreate: mocks.save,
    labelsControllerUpdate: mocks.save,
    applicationCompliancesControllerCreate: mocks.save,
    applicationCompliancesControllerUpdate: mocks.save,
  },
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: mocks.toast, addSuccessMessage: mocks.toast }),
}));
vi.mock("@/composables/use-app-permission", () => ({ useAppPermission: () => computed(() => true) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sources.mockResolvedValue({ data: { results: [] } });
  mocks.save.mockResolvedValue({ response: { ok: true }, data: {} });
});
afterEach(cleanup);

function expectError(field: HTMLElement, message: string) {
  expect(field).toHaveAttribute("aria-invalid", "true");
  const id = field.getAttribute("aria-describedby");
  expect(id).toBeTruthy();
  expect(document.getElementById(id!)).toHaveTextContent(message);
}

it("nomme Valeur, focalise le champ et permet de corriger avant l'envoi", async () => {
  render(LabelModal, {
    props: { applicationId: "app", errorMessage: "" },
    global: { stubs: { DsfrModal: { template: '<div role="dialog"><slot /></div>' } } },
  });
  await flushPromises();
  const submit = screen.getByTestId("label-submit-btn");
  await waitFor(() => expect(submit).toBeEnabled());
  const field = screen.getByTestId("label-value-input");
  expect(screen.getByTestId("label-form")).toHaveAttribute("novalidate");
  await fireEvent.update(field, "   ");
  await fireEvent.click(submit);
  expectError(field, "Veuillez compléter le champ : Valeur");
  expect(field).toHaveFocus();
  expect(mocks.save).not.toHaveBeenCalled();
  await fireEvent.update(field, "Nom alternatif");
  await fireEvent.click(submit);
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  expect(field).not.toHaveAttribute("aria-invalid");
});

it("nomme les trois champs du lien, refuse une URL mal formée et accepte la correction", async () => {
  const { emitted } = render(LinkForm);
  expect(screen.getByTestId("link-form")).toHaveAttribute("novalidate");
  const type = screen.getByRole("combobox", { name: /Type de lien/ });
  const url = screen.getByTestId("link-url-input");
  const description = screen.getByTestId("link-description-input");
  const submit = screen.getByTestId("link-submit-btn");
  await fireEvent.click(submit);
  expectError(type, "Veuillez compléter le champ : Type de lien");
  expectError(url, "Veuillez compléter le champ : URL");
  expectError(description, "Veuillez compléter le champ : Description");
  expect(type).toHaveFocus();
  expect(emitted().submit).toBeUndefined();
  await fireEvent.update(type, "documentation");
  await fireEvent.update(url, "pas-une-url");
  await fireEvent.update(description, "Documentation");
  await fireEvent.click(submit);
  expectError(url, "Veuillez saisir une URL valide dans le champ : URL");
  expect(url).toHaveFocus();
  expect(emitted().submit).toBeUndefined();
  await fireEvent.update(url, "https://example.org/doc");
  await fireEvent.click(submit);
  expect(emitted().submit).toHaveLength(1);
  expect(url).not.toHaveAttribute("aria-invalid");
});

function renderCompliance(type: "dima" | "pdma" | "homologation" | "eco_index") {
  return render(ComplianceForm, {
    props: {
      applicationId: "app",
      application: { myPerms: new Set() } as ApplicationWithPerms,
      type,
      mode: "create",
      initialData: null,
    },
  });
}

it("nomme la durée DIMA manquante et accepte zéro heure", async () => {
  renderCompliance("dima");
  expect(screen.getByTestId("compliance-form")).toHaveAttribute("novalidate");
  const field = screen.getByRole("combobox", { name: /Durée d'interruption maximale/ });
  await fireEvent.click(screen.getByTestId("compliance-submit-btn"));
  expectError(field, "Veuillez compléter le champ : Durée d'interruption maximale");
  expect(field).toHaveFocus();
  expect(mocks.save).not.toHaveBeenCalled();
  await fireEvent.update(field, "0");
  await fireEvent.click(screen.getByTestId("compliance-submit-btn"));
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ dima_duration_hours: 0 }) }));
});

it.each(["", "https://example.org"])("accepte l'URL EcoIndex facultative %j après une erreur de format", async (value) => {
  renderCompliance("eco_index");
  const field = screen.getByTestId("ecoindex-target-url-input");
  await fireEvent.update(field, "invalide");
  await fireEvent.click(screen.getByTestId("compliance-submit-btn"));
  expectError(field, "Veuillez saisir une URL valide dans le champ : URL cible EcoIndex");
  expect(field).toHaveFocus();
  expect(mocks.save).not.toHaveBeenCalled();
  await fireEvent.update(field, value);
  await fireEvent.click(screen.getByTestId("compliance-submit-btn"));
  expect(mocks.save).toHaveBeenCalledTimes(1);
});

it.each(["dima", "pdma", "homologation"] as const)("préserve la validation des dates de %s", async (type) => {
  renderCompliance(type);
  if (type === "dima") await fireEvent.update(screen.getByRole("combobox", { name: /Durée d'interruption maximale/ }), "0");
  if (type === "homologation") {
    await fireEvent.update(screen.getByRole("combobox", { name: /Statut d'homologation/ }), "homologuee");
  }
  const field = screen.getByTestId(type === "homologation" ? "compliance-homologation-date-end" : `compliance-${type}-last-test-date`);
  // jsdom ne reproduit pas la saisie partielle du contrôle date natif (badInput).
  const validity = vi.spyOn(field as HTMLInputElement, "validity", "get").mockReturnValue({ valid: false } as ValidityState);
  await fireEvent.click(screen.getByTestId("compliance-submit-btn"));
  expectError(field, type === "homologation" ? "Date de fin d'homologation" : "Date du dernier test");
  expect(field).toHaveFocus();
  expect(mocks.save).not.toHaveBeenCalled();
  validity.mockRestore();
  await fireEvent.update(field, "2026-11-16");
  await fireEvent.click(screen.getByTestId("compliance-submit-btn"));
  expect(mocks.save).toHaveBeenCalledTimes(1);
});

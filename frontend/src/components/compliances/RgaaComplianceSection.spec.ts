import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { ref } from "vue";
import type { RgaaComplianceDto } from "@/client/types.gen";
import type { APP_PERMISSIONS } from "@/models/Application";
import RgaaComplianceSection from "./RgaaComplianceSection.vue";

const { find, create, update, remove, errorToast, successToast } = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  errorToast: vi.fn(),
  successToast: vi.fn(),
}));
vi.mock("@/client/sdk.gen", () => ({
  rgaaControllerFindAll: find,
  rgaaControllerCreate: create,
  rgaaControllerUpdate: update,
  rgaaControllerDelete: remove,
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: errorToast, addSuccessMessage: successToast }) }));
vi.mock("@/composables/use-app-permission", () => ({ useAppPermission: () => ref(true) }));

const item = {
  id: "rgaa-1",
  applicationId: "app-1",
  service_url: "https://example.test/service",
  score_percentage: 0,
} satisfies RgaaComplianceDto;
const ok = <T>(data: T) => ({ data, response: { ok: true } });
const failed = () => ({ error: { message: "Indisponible" }, response: { ok: false } });
function renderSection() {
  return render(RgaaComplianceSection, {
    props: { applicationId: "app-1", appPerms: new Set<APP_PERMISSIONS>() },
    global: {
      stubs: {
        DsfrModal: {
          props: ["opened"],
          template: '<div v-if="opened" role="dialog"><button class="fr-btn--close">Fermer</button><slot /></div>',
        },
        RefAppTable: {
          props: ["items"],
          template:
            '<table><tbody><tr v-for="item in items" :key="item.id"><td><slot name="body-service_url" :data="item" /></td><td><slot name="body-accessibility_url" :data="item" /><slot name="body-score" :data="item" /></td><td><slot name="body-actions" :data="item" /></td></tr></tbody></table>',
        },
        AppLoader: true,
      },
    },
  });
}

beforeEach(() => {
  find.mockReset().mockResolvedValue(ok([]));
  create.mockReset();
  update.mockReset();
  remove.mockReset();
  errorToast.mockReset();
  successToast.mockReset();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("RgaaComplianceSection — réponses d'API et saisie", () => {
  it("distingue un chargement refusé d'une liste vide et expose son erreur dans une alerte", async () => {
    find.mockResolvedValue(failed());
    renderSection();
    const alert = screen.getByTestId("rgaa-load-error");
    expect(alert).toHaveAttribute("role", "alert");
    await waitFor(() => expect(alert).toHaveTextContent("Erreur lors du chargement"));
    expect(screen.queryByTestId("rgaa-empty")).not.toBeInTheDocument();
  });

  it("conserve le formulaire et son score après un échec de création, sans annoncer un succès", async () => {
    create.mockResolvedValue(failed());
    renderSection();
    await waitFor(() => expect(screen.getByTestId("rgaa-add-btn")).not.toBeDisabled());
    await fireEvent.click(screen.getByTestId("rgaa-add-btn"));
    await fireEvent.update(screen.getByTestId("rgaa-form-service-url"), "https://example.test/audit");
    await fireEvent.update(screen.getByTestId("rgaa-form-score"), "73");
    await fireEvent.click(screen.getByTestId("rgaa-form-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("rgaa-form-error")).toHaveTextContent("Erreur lors de la création de la conformité RGAA."),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("rgaa-form-score")).toHaveValue(73);
    expect(screen.getByTestId("rgaa-form-service-url")).toHaveValue("https://example.test/audit");
    expect(successToast).not.toHaveBeenCalled();
  });

  it("préremplit le score zéro et conserve la modification refusée avec la ligne originale", async () => {
    find.mockResolvedValue(ok([item]));
    update.mockResolvedValue(failed());
    renderSection();
    await fireEvent.click(await screen.findByTestId("rgaa-edit-btn"));
    expect(screen.getByTestId("rgaa-form-score")).toHaveValue(0);
    await fireEvent.update(screen.getByTestId("rgaa-form-score"), "73");
    await fireEvent.click(screen.getByTestId("rgaa-form-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("rgaa-form-error")).toHaveTextContent("Erreur lors de la modification de la conformité RGAA."),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("rgaa-form-score")).toHaveValue(73);
    expect(screen.getByTestId("rgaa-table")).toHaveTextContent("0% - Non conforme");
    expect(successToast).not.toHaveBeenCalled();
  });

  it.each(["create", "update"])("ferme le formulaire seulement après une réponse %s réussie", async (mode) => {
    if (mode === "update") find.mockResolvedValue(ok([item]));
    create.mockResolvedValue(ok({ ...item, score_percentage: 73 }));
    update.mockResolvedValue(ok({ ...item, score_percentage: 73 }));
    renderSection();
    if (mode === "update") await fireEvent.click(await screen.findByTestId("rgaa-edit-btn"));
    else {
      await waitFor(() => expect(screen.getByTestId("rgaa-add-btn")).not.toBeDisabled());
      await fireEvent.click(screen.getByTestId("rgaa-add-btn"));
    }
    await fireEvent.update(screen.getByTestId("rgaa-form-score"), "73");
    await fireEvent.click(screen.getByTestId("rgaa-form-submit"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("rgaa-table")).toHaveTextContent("73% - Partiellement conforme");
    expect(successToast).toHaveBeenCalledTimes(1);
    expect(errorToast).not.toHaveBeenCalled();
  });

  it("conserve la ligne après un échec de suppression malgré la confirmation", async () => {
    find.mockResolvedValue(ok([item]));
    remove.mockResolvedValue(failed());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderSection();
    await fireEvent.click(await screen.findByTestId("rgaa-delete-btn"));
    await waitFor(() => expect(errorToast).toHaveBeenCalledWith("Erreur lors de la suppression de la conformité RGAA."));
    expect(screen.getByTestId("rgaa-table")).toHaveTextContent(item.service_url);
    expect(successToast).not.toHaveBeenCalled();
  });
});

it("annonce la nouvelle fenêtre des liens RGAA (#3027)", async () => {
  find.mockResolvedValue(ok([{ ...item, accessibility_url: "https://example.test/accessibilite" }]));
  renderSection();
  const links = await screen.findAllByRole("link", { name: /nouvelle fenêtre/ });
  expect(links).toHaveLength(2);
  for (const link of links) {
    expect(link).toHaveAttribute("title", expect.stringContaining("nouvelle fenêtre"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

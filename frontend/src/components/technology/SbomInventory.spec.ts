import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import type { SbomComponent, SbomSource } from "@/services/sbom";
import SbomInventory from "./SbomInventory.vue";

const mocks = vi.hoisted(() => ({
  sources: vi.fn(),
  sourceImports: vi.fn(),
  components: vi.fn(),
  detail: vi.fn(),
  previewDeactivation: vi.fn(),
  deactivate: vi.fn(),
}));
vi.mock("@/services/sbom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/sbom")>()),
  sbomApi: mocks,
}));

const source: SbomSource = {
  id: "source-1",
  name: "backend-production",
  context: null,
  active: true,
  revision: 7,
  currentImportId: "import-1",
  componentCount: 1,
  importCount: 1,
  updatedAt: "2026-11-09T08:00:00Z",
  imports: [
    { id: "import-1", createdAt: "2026-11-09T08:00:00Z", format: "SPDX", specVersion: "2.3", componentCount: 1, status: "committed" },
  ],
};
const component: SbomComponent = {
  id: "component-1",
  ref: "SPDXRef-library",
  product: "library",
  version: null,
  technology: "Bibliothèque",
  purl: null,
  ecosystem: null,
  type: "library",
  identificationStatus: "incomplete",
  sourceName: "backend-production",
  importId: "import-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sources.mockResolvedValue([source]);
  mocks.components.mockResolvedValue({ results: [component], total: 30 });
  mocks.previewDeactivation.mockResolvedValue({ removed: 1, revision: 7 });
  mocks.deactivate.mockResolvedValue({ id: "source-1", revision: 8 });
});
afterEach(cleanup);

describe("inventaire SBOM", () => {
  it("affiche la provenance et l’identification incomplète, puis pagine côté serveur", async () => {
    render(SbomInventory, { props: { applicationId: "app-1", canEdit: false } });
    await screen.findByText("Identification à compléter");
    expect(screen.getByText("SBOM · backend-production")).toBeVisible();
    expect(screen.getByText("PURL non renseigné")).toBeVisible();
    expect(screen.queryByRole("button", { name: /désactivation/ })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: "Page suivante (page 2 sur 2)" }));
    await waitFor(() =>
      expect(mocks.components).toHaveBeenLastCalledWith("app-1", { page: 1, pageSize: 15, search: "" }, expect.any(AbortSignal)),
    );
    await fireEvent.update(screen.getByLabelText("Rechercher un composant SBOM"), "library");
    await fireEvent.submit(screen.getByRole("search"));
    await waitFor(() =>
      expect(mocks.components).toHaveBeenLastCalledWith("app-1", { page: 0, pageSize: 15, search: "library" }, expect.any(AbortSignal)),
    );
  });

  it("prévisualise la désactivation et transmet la révision confirmée", async () => {
    render(SbomInventory, { props: { applicationId: "app-1", canEdit: true } });
    await fireEvent.click(await screen.findByRole("button", { name: "Prévisualiser la désactivation de backend-production" }));
    const confirm = await screen.findByRole("button", { name: "Confirmer la désactivation" });
    expect(screen.getByText(/1 composants seront retirés/)).toBeVisible();
    expect(mocks.deactivate).not.toHaveBeenCalled();
    mocks.sources.mockResolvedValue([{ ...source, active: false, revision: 8 }]);
    mocks.components.mockResolvedValue({ results: [], total: 0 });
    await fireEvent.click(confirm);
    await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith("app-1", { id: "source-1", revision: 7 }, expect.any(AbortSignal)));
    await screen.findByText("backend-production — Inactive");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Dépendances importées par SBOM" })).toHaveFocus());
  });

  it("annule la désactivation sans mutation et rend le focus à son déclencheur", async () => {
    render(SbomInventory, { props: { applicationId: "app-1", canEdit: true } });
    const trigger = await screen.findByRole("button", { name: "Prévisualiser la désactivation de backend-production" });
    await fireEvent.click(trigger);
    await fireEvent.click(await screen.findByRole("button", { name: "Annuler la désactivation" }));
    expect(mocks.deactivate).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("ne laisse pas une ancienne réponse afficher les composants d’une autre application", async () => {
    let resolve: ((value: { results: SbomComponent[]; total: number }) => void) | undefined;
    mocks.components.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { rerender } = render(SbomInventory, { props: { applicationId: "app-1", canEdit: false } });
    mocks.sources.mockResolvedValue([]);
    mocks.components.mockResolvedValue({ results: [], total: 0 });
    await rerender({ applicationId: "app-2" });
    await screen.findByText("Aucun composant à afficher.");
    resolve?.({ results: [component], total: 1 });
    await waitFor(() => expect(screen.queryByText("SBOM · backend-production")).not.toBeInTheDocument());
    expect(mocks.components.mock.calls[0][2].aborted).toBe(true);
  });

  it("présente les avertissements et les relations externes non résolues dans l’historique", async () => {
    mocks.detail.mockResolvedValue({
      id: "import-1",
      sourceName: source.name,
      createdAt: source.updatedAt,
      format: "SPDX",
      specVersion: "2.3",
      status: "committed",
      totalComponents: 1,
      warnings: ["Les informations VEX ne sont pas exploitées."],
      changes: { added: [], removed: [], changed: [], unchanged: 1 },
      components: [
        { ...component, context: "inventory" },
        { ...component, ref: "SPDXRef-builder", product: "build-tool", context: "provenance" },
        { ...component, ref: "SPDXRef-excluded", product: "excluded-library", context: "excluded" },
      ],
      relations: [{ from: "SPDXRef-library", to: "DocumentRef-other:SPDXRef-x", type: "DEPENDS_ON", resolved: false }],
    });
    render(SbomInventory, { props: { applicationId: "app-1", canEdit: false } });
    const consult = await screen.findByRole("button", { name: /Consulter l’import/ });
    consult.closest("details")?.setAttribute("open", "");
    await fireEvent.click(consult);
    const region = await screen.findByRole("region", { name: /Import de backend-production/ });
    expect(within(region).getByText("Les informations VEX ne sont pas exploitées.")).toBeVisible();
    expect(within(region).getByText(/référence externe non résolue/)).toBeVisible();
    expect(within(region).getByText("Composant de l’inventaire déclaré")).toBeVisible();
    expect(within(region).getByText("Provenance uniquement — hors inventaire courant")).toBeVisible();
    expect(within(region).getByText("Composant exclu — hors inventaire courant")).toBeVisible();
    expect(mocks.detail).toHaveBeenCalledWith("app-1", "import-1", expect.any(AbortSignal));
  });
});

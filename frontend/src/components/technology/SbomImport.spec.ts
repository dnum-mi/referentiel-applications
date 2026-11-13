import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { SbomRequestError, type SbomPreview, type SbomSource } from "@/services/sbom";
import SbomImport from "./SbomImport.vue";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), commit: vi.fn() }));
vi.mock("@/services/sbom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/sbom")>()),
  sbomApi: mocks,
}));

const preview: SbomPreview = {
  id: "preview-1",
  sourceName: "frontend-production",
  baseRevision: 2,
  expiresAt: "2026-11-10T12:00:00.000Z",
  format: "CycloneDX",
  specVersion: "1.6",
  warnings: ["Une référence externe reste non résolue."],
  counts: { added: 1, removed: 1, changed: 1, unchanged: 2 },
  totalComponents: 4,
  unchanged: false,
  changes: {
    added: [{ ref: "react-19", product: "react", version: "19.0.0" }],
    removed: [{ ref: "legacy-1", product: "legacy", version: "1.0.0" }],
    changed: [{ before: { ref: "vue-3", product: "vue", version: "3.4.0" }, after: { ref: "vue-3", product: "vue", version: "3.5.0" } }],
    unchanged: 2,
  },
};
const source: SbomSource = {
  id: "source-1",
  name: "frontend-production",
  context: "Production",
  active: true,
  revision: 2,
  currentImportId: "old",
  componentCount: 4,
  importCount: 0,
  updatedAt: "2026-11-01T00:00:00Z",
  imports: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.preview.mockResolvedValue(preview);
  mocks.commit.mockResolvedValue({ id: "preview-1", sourceId: "source-1", revision: 3, unchanged: false });
});
afterEach(cleanup);

async function chooseImport() {
  await fireEvent.click(screen.getByRole("button", { name: "Importer un SBOM" }));
  await fireEvent.update(screen.getByLabelText("Source de l’inventaire"), "source-1");
  await fireEvent.change(screen.getByLabelText(/Fichier SBOM JSON/), {
    target: { files: [new File(["{}"], "another-source.json", { type: "application/json" })] },
  });
  await fireEvent.submit(screen.getByRole("button", { name: "Analyser le fichier" }).closest("form")!);
}

describe("import SBOM", () => {
  it("analyse la source explicitement choisie et montre les versions avant confirmation", async () => {
    const { emitted } = render(SbomImport, { props: { applicationId: "app-1", canEdit: true, sources: [source] } });
    await chooseImport();
    await screen.findByRole("button", { name: "Confirmer l’import" });
    expect(mocks.preview).toHaveBeenCalledWith(
      "app-1",
      expect.objectContaining({ sourceName: "frontend-production", context: "Production", file: expect.any(File) }),
      expect.any(AbortSignal),
    );
    expect(screen.getByText("3.4.0")).toBeVisible();
    expect(screen.getByText("3.5.0")).toBeVisible();
    expect(screen.getByText("Une référence externe reste non résolue.")).toBeVisible();
    expect(mocks.commit).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Confirmer l’import" }));
    await screen.findByText("SBOM importé. L’inventaire a été mis à jour.");
    expect(mocks.commit).toHaveBeenCalledWith("app-1", "preview-1", expect.any(AbortSignal));
    expect(emitted().imported).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Importer un SBOM" })).toHaveFocus();
  });

  it("annule la prévisualisation sans confirmer et restitue le focus", async () => {
    render(SbomImport, { props: { applicationId: "app-1", canEdit: true, sources: [source] } });
    await chooseImport();
    await screen.findByRole("button", { name: "Confirmer l’import" });
    await fireEvent.click(screen.getByRole("button", { name: "Annuler l’import" }));
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Importer un SBOM" })).toHaveFocus();
    expect(screen.getByText(/Import annulé/)).toBeVisible();
  });

  it.each([409, 410, 403])("empêche de reconfirmer l’analyse après un refus %s", async (status) => {
    mocks.commit.mockRejectedValue(new SbomRequestError("Analyse à refaire", status));
    render(SbomImport, { props: { applicationId: "app-1", canEdit: true, sources: [source] } });
    await chooseImport();
    await fireEvent.click(await screen.findByRole("button", { name: "Confirmer l’import" }));
    await screen.findByText("Analyse à refaire");
    expect(screen.queryByRole("button", { name: "Confirmer l’import" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("ignore une analyse devenue obsolète après changement d’application", async () => {
    let resolve: ((value: SbomPreview) => void) | undefined;
    mocks.preview.mockReturnValue(
      new Promise<SbomPreview>((done) => {
        resolve = done;
      }),
    );
    const { rerender } = render(SbomImport, { props: { applicationId: "app-1", canEdit: true, sources: [source] } });
    await chooseImport();
    await rerender({ applicationId: "app-2", canEdit: true, sources: [] });
    resolve?.(preview);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirmer l’import" })).not.toBeInTheDocument());
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(mocks.preview.mock.calls[0][2].aborted).toBe(true);
  });

  it("retire la confirmation lorsque le droit d’écriture est révoqué", async () => {
    const { rerender } = render(SbomImport, { props: { applicationId: "app-1", canEdit: true, sources: [source] } });
    await chooseImport();
    await screen.findByRole("button", { name: "Confirmer l’import" });
    await rerender({ canEdit: false });
    expect(screen.queryByRole("button", { name: "Confirmer l’import" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Importer un SBOM" })).not.toBeInTheDocument();
    expect(mocks.commit).not.toHaveBeenCalled();
  });
});

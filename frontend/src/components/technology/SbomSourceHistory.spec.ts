import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import type { SbomSource, SbomSourceImport } from "@/services/sbom";
import SbomSourceHistory from "./SbomSourceHistory.vue";

const mocks = vi.hoisted(() => ({ sourceImports: vi.fn() }));
vi.mock("@/services/sbom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/sbom")>()),
  sbomApi: mocks,
}));

function entry(index: number): SbomSourceImport {
  return {
    id: `import-${index}`,
    createdAt: new Date(Date.UTC(2026, 10, 9, 12, index)).toISOString(),
    format: "SPDX",
    specVersion: "2.3",
    componentCount: index + 1,
    status: "committed",
  };
}

const source: SbomSource = {
  id: "source-1",
  name: "backend-production",
  context: null,
  active: true,
  revision: 45,
  currentImportId: "import-44",
  componentCount: 45,
  updatedAt: "2026-11-09T12:44:00Z",
  importCount: 45,
  imports: Array.from({ length: 20 }, (_, index) => entry(index)),
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

async function openHistory() {
  const summary = screen.getByText("Historique de backend-production (45)");
  summary.closest("details")?.setAttribute("open", "");
  await fireEvent(summary.closest("details")!, new Event("toggle"));
}

describe("historique SBOM paginé", () => {
  it("affiche les vingt imports fournis, puis charge les autres pages sans tronquer l’historique", async () => {
    mocks.sourceImports.mockResolvedValue({ total: 45, results: [entry(40), entry(41), entry(42), entry(43), entry(44)] });
    const { emitted } = render(SbomSourceHistory, { props: { applicationId: "app-1", source, disabled: false } });
    await openHistory();
    expect(screen.getAllByRole("button", { name: /Consulter l’import/ })).toHaveLength(20);
    expect(mocks.sourceImports).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "Dernière page (page 3 sur 3)" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Consulter l’import/ })).toHaveLength(5));
    expect(mocks.sourceImports).toHaveBeenCalledWith("app-1", "source-1", { page: 2, pageSize: 20 }, expect.any(AbortSignal));
    await fireEvent.click(screen.getAllByRole("button", { name: /Consulter l’import/ })[4]);
    expect(emitted().inspect[0]).toEqual(["import-44", expect.any(Event)]);
    mocks.sourceImports.mockResolvedValue({ total: 45, results: Array.from({ length: 30 }, (_, index) => entry(index)) });
    await fireEvent.update(screen.getByLabelText("Résultats par page"), "30");
    await waitFor(() =>
      expect(mocks.sourceImports).toHaveBeenLastCalledWith("app-1", "source-1", { page: 0, pageSize: 30 }, expect.any(AbortSignal)),
    );
  });

  it("annonce une erreur de chargement et permet de réessayer la même page", async () => {
    mocks.sourceImports.mockRejectedValueOnce(new Error("Historique indisponible"));
    render(SbomSourceHistory, { props: { applicationId: "app-1", source, disabled: false } });
    await openHistory();
    await fireEvent.click(screen.getByRole("button", { name: "Page suivante (page 2 sur 3)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Historique indisponible");
    mocks.sourceImports.mockResolvedValue({ total: 45, results: [entry(20)] });
    await fireEvent.click(screen.getByRole("button", { name: "Réessayer le chargement de l’historique" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Consulter l’import/ })).toHaveLength(1));
    expect(mocks.sourceImports).toHaveBeenLastCalledWith("app-1", "source-1", { page: 1, pageSize: 20 }, expect.any(AbortSignal));
  });

  it("ignore une page devenue obsolète lors du changement d’application", async () => {
    let resolve: ((value: { total: number; results: SbomSourceImport[] }) => void) | undefined;
    mocks.sourceImports.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { rerender } = render(SbomSourceHistory, { props: { applicationId: "app-1", source, disabled: false } });
    await openHistory();
    await fireEvent.click(screen.getByRole("button", { name: "Page suivante (page 2 sur 3)" }));
    await rerender({ applicationId: "app-2", source: { ...source, id: "source-2", name: "frontend", importCount: 0, imports: [] } });
    resolve?.({ total: 45, results: [entry(20)] });
    await waitFor(() => expect(screen.getByText("Historique de frontend (0)")).toBeInTheDocument());
    expect(screen.queryAllByRole("button", { name: /Consulter l’import/ })).toHaveLength(0);
    expect(mocks.sourceImports.mock.calls[0][3].aborted).toBe(true);
  });
});

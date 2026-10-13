import { createPinia, setActivePinia } from "pinia";
import { useApplicationStore } from "./applicationStore";

const {
  removeMock,
  exportPowerpointMock,
  exportHtmlMock,
  exportProductHtmlMock,
  gristSetupMock,
  gristTablesMock,
  addErrorMessage,
  addSuccessMessage,
  push,
} = vi.hoisted(() => ({
  removeMock: vi.fn(),
  exportPowerpointMock: vi.fn(),
  exportHtmlMock: vi.fn(),
  exportProductHtmlMock: vi.fn(),
  gristSetupMock: vi.fn(),
  gristTablesMock: vi.fn(),
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    applicationControllerRemove: removeMock,
    applicationControllerExportProductPowerpoint: exportPowerpointMock,
    applicationControllerExportHtml: exportHtmlMock,
    applicationControllerExportProductHtml: exportProductHtmlMock,
    gristControllerSetup: gristSetupMock,
    gristControllerTables: gristTablesMock,
  },
}));

vi.mock("@/router", () => ({
  default: { push },
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage, addSuccessMessage }),
}));

describe("applicationStore.deleteApplication — retour d'erreur (#2542)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    removeMock.mockReset();
    addErrorMessage.mockReset();
    addSuccessMessage.mockReset();
    push.mockReset();
  });

  it("relaie le message du backend quand la suppression est refusée (409)", async () => {
    const message = "Suppression impossible : des données liées (ReportHistory.reportId) empêchent la suppression de l'application.";
    removeMock.mockResolvedValueOnce({ response: { ok: false, status: 409 }, error: { message, statusCode: 409 } });

    await expect(useApplicationStore().deleteApplication("app-1")).rejects.toThrow(message);

    expect(addErrorMessage).toHaveBeenCalledWith(message);
    expect(push).not.toHaveBeenCalled();
  });

  it("garde le libellé générique pour les autres erreurs", async () => {
    removeMock.mockResolvedValueOnce({ response: { ok: false, status: 500 }, error: { message: "Internal server error" } });

    await expect(useApplicationStore().deleteApplication("app-1")).rejects.toThrow(
      "Erreur lors de la suppression définitive de l'application.",
    );

    expect(addErrorMessage).toHaveBeenCalledWith("Erreur lors de la suppression définitive de l'application.");
  });

  it.each([
    { failure: "réseau sans réponse", response: undefined, error: new TypeError("Failed to fetch") },
    { failure: "décodage après un HTTP 200", response: { ok: true, status: 200 }, error: new SyntaxError("Invalid JSON") },
  ])("ne confirme pas la suppression après une erreur $failure", async ({ response, error }) => {
    removeMock.mockResolvedValueOnce({ response, error });

    await expect(useApplicationStore().deleteApplication("app-1")).rejects.toThrow(
      "Erreur lors de la suppression définitive de l'application.",
    );

    expect(addErrorMessage).toHaveBeenCalledExactlyOnceWith("Erreur lors de la suppression définitive de l'application.");
    expect(addSuccessMessage).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("redirige vers la recherche et confirme après une suppression réussie", async () => {
    removeMock.mockResolvedValueOnce({ response: { ok: true, status: 204 } });

    await useApplicationStore().deleteApplication("app-1");

    expect(push).toHaveBeenCalledTimes(1);
    expect(addSuccessMessage).toHaveBeenCalledWith("Application supprimée définitivement avec succès.");
    expect(addErrorMessage).not.toHaveBeenCalled();
  });
});

describe("applicationStore — versions HTML des exports", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    exportHtmlMock.mockReset();
    exportProductHtmlMock.mockReset();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:export"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("conserve tous les filtres et le tri de l'export, indépendamment de la pagination", async () => {
    exportHtmlMock.mockResolvedValueOnce({ response: { ok: true, status: 200 }, data: "<!doctype html><html lang='fr'></html>" });
    await useApplicationStore().downloadHtml({
      label: "Portail",
      page: 3,
      pageSize: 15,
      sortBy: "label",
      order: "desc",
      tag: [],
      hostingSite: undefined,
    });
    expect(exportHtmlMock).toHaveBeenCalledExactlyOnceWith({
      query: { label: "Portail", page: 3, pageSize: 0, sortBy: "label", order: "desc" },
      parseAs: "blob",
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });

  it("demande la même fiche produit par identifiant et signale une erreur avant tout téléchargement", async () => {
    exportProductHtmlMock.mockResolvedValueOnce({ response: { ok: false, status: 403 }, error: { message: "Forbidden" } });
    await expect(useApplicationStore().downloadProductHtml("app-1")).rejects.toThrow("Erreur lors de l’export de la fiche produit HTML.");
    expect(exportProductHtmlMock).toHaveBeenCalledExactlyOnceWith({ path: { applicationId: "app-1" }, parseAs: "blob" });
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});

describe("applicationStore.downloadProductPowerpoint — erreurs du client API", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    exportPowerpointMock.mockReset();
  });

  it.each([
    { failure: "réseau sans réponse", response: undefined, error: new TypeError("Failed to fetch") },
    { failure: "décodage après HTTP 200", response: { ok: true, status: 200 }, error: new SyntaxError("Invalid blob") },
  ])("signale l'échec $failure sans tenter de télécharger", async ({ response, error }) => {
    exportPowerpointMock.mockResolvedValueOnce({ response, error });

    await expect(useApplicationStore().downloadProductPowerpoint("app-1")).rejects.toThrow("Erreur lors de l'export PowerPoint.");
    expect(exportPowerpointMock).toHaveBeenCalledExactlyOnceWith({ path: { applicationId: "app-1" }, parseAs: "blob" });
  });
});

describe("applicationStore — synchronisation Grist", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    gristSetupMock.mockReset();
    gristTablesMock.mockReset();
  });

  it("conserve les filtres et les cibles Grist sans modifier le contrat des exports", async () => {
    const report = { documents: [{ docId: "doc1", tableId: "RefApp", status: "ok", rowsWritten: 2 }] };
    gristSetupMock.mockResolvedValueOnce({ response: { ok: true, status: 200 }, data: report });
    const targets = [
      { docId: "doc1", tableId: "RefApp" },
      { docId: "doc2", newTable: true },
    ];
    const result = await useApplicationStore().syncWithGrist({ shortName: "Portail", page: 2, tag: [], hostingSite: undefined }, targets);
    expect(gristSetupMock).toHaveBeenCalledExactlyOnceWith({ query: { shortName: "Portail", page: 2 }, body: { targets } });
    expect(result).toEqual(report);
  });

  it("laisse le backend choisir les tables par défaut quand aucune cible n'est fournie", async () => {
    gristSetupMock.mockResolvedValueOnce({ response: { ok: true, status: 200 }, data: { documents: [] } });
    await useApplicationStore().syncWithGrist();
    expect(gristSetupMock).toHaveBeenCalledExactlyOnceWith({ query: {}, body: { targets: undefined } });
  });

  it("rend les documents et tables disponibles dans le profil", async () => {
    const documents = [{ docId: "doc1", tables: ["RefApp", "RefApp2"] }];
    gristTablesMock.mockResolvedValueOnce({ response: { ok: true, status: 200 }, data: documents });
    await expect(useApplicationStore().listGristTables()).resolves.toEqual(documents);
    expect(gristTablesMock).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([
    { response: undefined, error: new TypeError("Failed to fetch") },
    { response: { ok: false, status: 403 }, error: { message: "Forbidden" } },
  ])("relaie les échecs Grist au composant sans confirmer une synchronisation", async ({ response, error }) => {
    gristSetupMock.mockResolvedValueOnce({ response, error });
    gristTablesMock.mockResolvedValueOnce({ response, error });
    await expect(useApplicationStore().syncWithGrist()).rejects.toThrow("Erreur lors de la synchronisation avec Grist.");
    await expect(useApplicationStore().listGristTables()).rejects.toThrow("Erreur lors de la lecture des documents Grist.");
  });
});

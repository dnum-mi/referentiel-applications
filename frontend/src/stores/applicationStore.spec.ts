import { createPinia, setActivePinia } from "pinia";
import { useApplicationStore } from "./applicationStore";

const { removeMock, addErrorMessage, addSuccessMessage, push } = vi.hoisted(() => ({
  removeMock: vi.fn(),
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: { applicationControllerRemove: removeMock },
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

  it("redirige vers la recherche et confirme après une suppression réussie", async () => {
    removeMock.mockResolvedValueOnce({ response: { ok: true, status: 204 } });

    await useApplicationStore().deleteApplication("app-1");

    expect(push).toHaveBeenCalledTimes(1);
    expect(addSuccessMessage).toHaveBeenCalledWith("Application supprimée définitivement avec succès.");
    expect(addErrorMessage).not.toHaveBeenCalled();
  });
});

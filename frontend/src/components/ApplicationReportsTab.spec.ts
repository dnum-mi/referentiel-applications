import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { ref } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import ApplicationReportsTab from "./ApplicationReportsTab.vue";

const { find, create, successToast, errorToast } = vi.hoisted(() => ({
  find: vi.fn(),
  create: vi.fn(),
  successToast: vi.fn(),
  errorToast: vi.fn(),
}));
vi.mock("@/api", () => ({ default: { applicationReportsControllerFindAll: find, applicationReportsControllerCreate: create } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addSuccessMessage: successToast, addErrorMessage: errorToast }) }));
vi.mock("@/composables/use-app-permission", () => ({ useAppPermission: () => ref(true) }));
const failed = () => ({ error: { message: "Indisponible" }, response: { ok: false } });
const success = () => ({ response: { ok: true } });
function renderTab() {
  return render(ApplicationReportsTab, {
    // Seuls l'identifiant et les permissions de l'application sont utilisés dans cet onglet.
    props: { application: { id: "app-1", myPerms: new Set() } as ApplicationWithPerms },
    global: { stubs: { RefAppTable: { template: "<table />" }, AppLoader: true } },
  });
}
beforeEach(() => {
  find.mockReset().mockResolvedValue({ data: { results: [], total: 0 }, response: { ok: true } });
  create.mockReset();
  successToast.mockReset();
  errorToast.mockReset();
});
afterEach(() => {
  cleanup();
  document.querySelector('[data-testid="another-command"]')?.remove();
});

describe("ApplicationReportsTab — signalement et retour de focus", () => {
  it("conserve la saisie et le focus après une réponse refusée, avec une erreur locale et aucun faux succès", async () => {
    create.mockResolvedValue(failed());
    renderTab();
    const field = screen.getByRole("textbox", { name: /Décrivez votre signalement/ });
    await fireEvent.update(field, "Description conservée");
    const button = screen.getByTestId("report-issue-submit-btn");
    button.focus();
    await fireEvent.click(button);
    await waitFor(() => expect(screen.getByTestId("report-issue-error")).toHaveTextContent("Votre saisie est conservée"));
    expect(field).toHaveValue("Description conservée");
    expect(button).toHaveFocus();
    expect(successToast).not.toHaveBeenCalled();
    expect(find).toHaveBeenCalledTimes(1);
  });

  it("empêche un envoi concurrent sans retirer le bouton de la navigation puis cible le champ après succès", async () => {
    let finish!: (result: ReturnType<typeof success>) => void;
    create.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderTab();
    const field = screen.getByRole("textbox", { name: /Décrivez votre signalement/ });
    await fireEvent.update(field, "Signalement local");
    const button = screen.getByTestId("report-issue-submit-btn");
    button.focus();
    await fireEvent.click(button);
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    await fireEvent.click(button);
    expect(create).toHaveBeenCalledTimes(1);
    finish(success());
    await waitFor(() => expect(field).toHaveValue(""));
    await waitFor(() => expect(field).toHaveFocus());
    expect(successToast).toHaveBeenCalledTimes(1);
  });

  it("respecte le déplacement volontaire pendant l'envoi", async () => {
    let finish!: (result: ReturnType<typeof success>) => void;
    create.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderTab();
    const field = screen.getByRole("textbox", { name: /Décrivez votre signalement/ });
    await fireEvent.update(field, "Signalement local");
    const button = screen.getByTestId("report-issue-submit-btn");
    button.focus();
    await fireEvent.click(button);
    const anotherCommand = document.createElement("button");
    anotherCommand.setAttribute("data-testid", "another-command");
    anotherCommand.textContent = "Autre commande";
    document.body.appendChild(anotherCommand);
    anotherCommand.focus();
    finish(success());
    await waitFor(() => expect(field).toHaveValue(""));
    expect(anotherCommand).toHaveFocus();
  });

  it("affiche un échec de chargement comme une erreur au lieu d'un tableau vide", async () => {
    find.mockResolvedValue(failed());
    renderTab();
    await waitFor(() => expect(screen.getByTestId("reports-load-error")).toHaveTextContent("Erreur lors du chargement"));
    expect(screen.getByTestId("reports-load-error")).toHaveAttribute("role", "alert");
    expect(screen.queryByTestId("reports-table")).not.toBeInTheDocument();
  });
});

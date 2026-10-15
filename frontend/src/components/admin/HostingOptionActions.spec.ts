import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { HostingOptionWithUsageDto } from "@/client/types.gen";
import HostingOptionActions from "./HostingOptionActions.vue";
enableAutoUnmount(afterEach);

const { createMock, updateMock, removeMock, addSuccessMessage, addErrorMessage } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  removeMock: vi.fn(),
  addSuccessMessage: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("@/api", () => ({
  default: {
    hostingOptionControllerCreate: createMock,
    hostingOptionControllerUpdate: updateMock,
    hostingOptionControllerRemove: removeMock,
  },
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addSuccessMessage, addErrorMessage }),
}));

const option = {
  id: "option-1",
  provider: "DTNUM",
  platform: "VIRTUALISATION",
  site: "CER(RENNES)",
  building: "B15",
  room: null,
  hostingsCount: 3,
} satisfies HostingOptionWithUsageDto;

function renderActions(hostingOption?: HostingOptionWithUsageDto) {
  return render(HostingOptionActions, {
    props: { hostingOption },
    global: {
      stubs: {
        DsfrModal: {
          props: { opened: Boolean },
          template: '<div v-if="opened"><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
}

const input = (label: string) => screen.getByLabelText(new RegExp(`^${label}`)) as HTMLInputElement;
const saveButton = () => screen.getByRole("button", { name: "Enregistrer" });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("hostingOptionActions (#2688)", () => {
  it.each([
    { action: "save", moveFocus: false },
    { action: "save", moveFocus: true },
    { action: "delete", moveFocus: false },
    { action: "delete", moveFocus: true },
  ] as const)("$action : conserve le contexte et le choix de focus ($moveFocus)", async ({ action, moveFocus }) => {
    let finish = () => {};
    const mutation = action === "save" ? updateMock : removeMock;
    mutation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ response: { ok: false, status: 500 }, error: "refus fictif" });
        }),
    );
    const wrapper = mount(HostingOptionActions, {
      attachTo: document.body,
      props: { hostingOption: option },
      global: {
        stubs: {
          DsfrModal: {
            props: ["opened"],
            template:
              '<section v-if="opened" role="dialog"><button class="fr-btn--close">Fermer</button><slot/><slot name="footer"/></section>',
          },
        },
      },
    });
    await wrapper
      .get(`[data-testid="${action === "save" ? "admin-hosting-option-edit-btn" : "admin-hosting-option-delete-btn"}"]`)
      .trigger("click");
    const button = wrapper.get<HTMLButtonElement>(
      `[data-testid="${action === "save" ? "admin-save-hosting-option-btn" : "admin-delete-confirm-btn"}"]`,
    );
    button.element.focus();
    await button.trigger("click");
    expect(button.element).toBeDisabled();
    const transient = document.createElement("button");
    document.body.append(transient);
    transient.focus();
    transient.remove();
    await flushPromises();
    expect(wrapper.get(".fr-btn--close").element).toHaveFocus();
    const cancel = wrapper.get<HTMLButtonElement>(`[data-testid="${action === "save" ? "admin-cancel-btn" : "admin-delete-cancel-btn"}"]`);
    if (moveFocus) cancel.element.focus();
    finish();
    await flushPromises();
    expect(moveFocus ? cancel.element : button.element).toHaveFocus();
    expect(button.element).not.toBeDisabled();
    if (action === "save")
      expect(wrapper.get('[role="dialog"]').text()).toContain("Erreur lors de la sauvegarde de la plateforme d'hébergement.");
    else expect(addErrorMessage).toHaveBeenCalledWith("Erreur lors de la suppression de la plateforme d'hébergement");
  });
  it("crée une plateforme une fois les champs obligatoires renseignés", async () => {
    createMock.mockResolvedValue({ response: { ok: true, status: 201 } });
    const { emitted } = renderActions();

    await fireEvent.click(screen.getByRole("button", { name: "Créer une plateforme" }));
    expect(saveButton()).toBeDisabled();

    await fireEvent.update(input("Fournisseur"), "OVH");
    await fireEvent.update(input("Plateforme"), "CLOUD");
    expect(saveButton()).toBeDisabled();
    await fireEvent.update(input("Site"), "ROUBAIX");
    expect(saveButton()).toBeEnabled();

    await fireEvent.click(saveButton());

    await waitFor(() => expect(emitted().fetchHostingOptions).toHaveLength(1));
    expect(createMock).toHaveBeenCalledExactlyOnceWith({
      body: { provider: "OVH", platform: "CLOUD", site: "ROUBAIX", building: "", room: "" },
    });
    expect(addSuccessMessage).toHaveBeenCalledWith("Plateforme d'hébergement créée avec succès");
  });

  it("pré-remplit la modification et permet de vider un champ optionnel", async () => {
    updateMock.mockResolvedValue({ response: { ok: true, status: 200 } });
    renderActions(option);

    await fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    expect(input("Fournisseur").value).toBe("DTNUM");
    expect(input("Bâtiment").value).toBe("B15");
    expect(input("Pièce").value).toBe("");

    await fireEvent.update(input("Bâtiment"), "");
    await fireEvent.click(saveButton());

    await waitFor(() => expect(updateMock).toHaveBeenCalledOnce());
    expect(updateMock).toHaveBeenCalledWith({
      path: { id: "option-1" },
      body: { provider: "DTNUM", platform: "VIRTUALISATION", site: "CER(RENNES)", building: "", room: "" },
    });
  });

  it("signale un doublon sans fermer la modale", async () => {
    updateMock.mockResolvedValue({ response: { ok: false, status: 409 } });
    const { emitted } = renderActions(option);

    await fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    await fireEvent.click(saveButton());

    expect(await screen.findByText("Cette plateforme d'hébergement existe déjà.")).toBeInTheDocument();
    expect(saveButton()).toBeInTheDocument();
    expect(emitted().fetchHostingOptions).toBeUndefined();
  });

  it.each([
    { failure: "réseau sans réponse", response: undefined, error: new TypeError("Failed to fetch") },
    { failure: "décodage après un HTTP 200", response: { ok: true, status: 200 }, error: new SyntaxError("Invalid JSON") },
  ])("signale une erreur $failure et laisse la modification disponible", async ({ response, error }) => {
    updateMock.mockResolvedValueOnce({ response, error });
    const { emitted } = renderActions(option);

    await fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    await fireEvent.click(saveButton());

    expect(await screen.findByText("Erreur lors de la sauvegarde de la plateforme d'hébergement.")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    expect(addSuccessMessage).not.toHaveBeenCalled();
    expect(emitted().fetchHostingOptions).toBeUndefined();
  });

  it("annonce le nombre d'hébergements détachés avant suppression", async () => {
    removeMock.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { emitted } = renderActions(option);

    await fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(screen.getByTestId("hosting-option-delete-alert")).toHaveTextContent(
      "DTNUM / VIRTUALISATION / CER(RENNES) / B15 ? Elle est utilisée par 3 hébergements d'application : ils ne seront plus rattachés à aucune plateforme.",
    );

    await fireEvent.click(screen.getByTestId("admin-delete-confirm-btn"));

    await waitFor(() => expect(emitted().fetchHostingOptions).toHaveLength(1));
    expect(removeMock).toHaveBeenCalledWith({ path: { id: "option-1" } });
  });

  it("n'évoque pas d'hébergements détachés pour une plateforme inutilisée", async () => {
    renderActions({ ...option, hostingsCount: 0 });

    await fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByTestId("hosting-option-delete-alert")).not.toHaveTextContent("utilisée par");
  });
});

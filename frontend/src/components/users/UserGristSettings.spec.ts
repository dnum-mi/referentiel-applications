import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { ref } from "vue";
import UserGristSettings from "./UserGristSettings.vue";

afterEach(() => cleanup());

const { addErrorMessage, addSuccessMessage, updateGristSettings } = vi.hoisted(() => ({
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
  updateGristSettings: vi.fn(),
}));
const gristDocIds = ref<string[]>([]);
const gristUrl = ref<string | null>(null);
const hasGristApiKey = ref(false);

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage, addSuccessMessage }),
}));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    get user() {
      return { gristDocIds: gristDocIds.value, gristUrl: gristUrl.value, hasGristApiKey: hasGristApiKey.value };
    },
    updateGristSettings,
  }),
}));

beforeEach(() => {
  gristDocIds.value = ["docAAAAAA1"];
  gristUrl.value = null;
  hasGristApiKey.value = false;
  addErrorMessage.mockReset();
  addSuccessMessage.mockReset();
  updateGristSettings.mockReset().mockResolvedValue(undefined);
});

async function submit(value: string) {
  render(UserGristSettings);
  await fireEvent.update(screen.getByLabelText(/Identifiant du document/), value);
  await fireEvent.click(screen.getByTestId("user-grist-document-add"));
}

describe("UserGristSettings — documents", () => {
  it("liste les documents du profil", () => {
    render(UserGristSettings);
    expect(screen.getAllByTestId("user-grist-document").map((li) => li.querySelector("code")?.textContent)).toEqual(["docAAAAAA1"]);
  });

  it("indique qu'aucun document n'est synchronisé", () => {
    gristDocIds.value = [];
    render(UserGristSettings);
    expect(screen.getByTestId("user-grist-documents-empty")).toBeInTheDocument();
  });

  it("ajoute un identifiant, espaces retirés, à la suite de la liste", async () => {
    await submit("  docBBBBBB2 ");

    await waitFor(() => expect(addSuccessMessage).toHaveBeenCalled());
    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristDocIds: ["docAAAAAA1", "docBBBBBB2"] });
  });

  it.each([
    ["une URL", "https://grist.numerique.gouv.fr/docBBBBBB2", "pas son URL"],
    ["un doublon", "docAAAAAA1", "déjà dans la liste"],
  ])("refuse %s sans appeler l'API", async (_, value, message) => {
    await submit(value);

    expect(await screen.findByText(new RegExp(message))).toBeInTheDocument();
    expect(updateGristSettings).not.toHaveBeenCalled();
  });

  it("retire un document", async () => {
    render(UserGristSettings);
    await fireEvent.click(screen.getByTestId("user-grist-document-remove"));

    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristDocIds: [] });
  });

  it("signale un refus du backend", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    updateGristSettings.mockRejectedValue(new Error("400"));
    await submit("docBBBBBB2");

    await waitFor(() => expect(addErrorMessage).toHaveBeenCalled());
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });
});

describe("UserGristSettings — connexion", () => {
  async function saveConnection({ url, apiKey }: { url?: string; apiKey?: string }) {
    render(UserGristSettings);
    if (url !== undefined) await fireEvent.update(screen.getByLabelText(/Adresse de l'instance Grist/), url);
    if (apiKey !== undefined) await fireEvent.update(screen.getByLabelText(/Clé d.API/), apiKey);
    await fireEvent.click(screen.getByTestId("user-grist-connection-save"));
  }

  it("propose grist.numerique.gouv.fr par défaut et masque la clé saisie", () => {
    render(UserGristSettings);
    expect(screen.getByLabelText(/Adresse de l'instance Grist/)).toHaveValue("https://grist.numerique.gouv.fr");
    expect(screen.getByLabelText(/Clé d.API/)).toHaveAttribute("type", "password");
  });

  it("enregistre l'URL et la clé, puis vide le champ de la clé", async () => {
    await saveConnection({ url: " https://grist.example ", apiKey: " cle123 " });

    await waitFor(() => expect(addSuccessMessage).toHaveBeenCalled());
    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristUrl: "https://grist.example", gristApiKey: "cle123" });
    expect(screen.getByLabelText(/Clé d.API/)).toHaveValue("");
  });

  it("montre une clé enregistrée par des points, sans valeur dans le champ", () => {
    hasGristApiKey.value = true;
    render(UserGristSettings);

    const input = screen.getByLabelText(/Clé d.API/);
    expect(input).toHaveAttribute("placeholder", "••••••••••••••••");
    expect(input).toHaveValue("");
  });

  it("n'affiche pas de points sans clé enregistrée", () => {
    render(UserGristSettings);

    expect(screen.getByLabelText(/Clé d.API/)).not.toHaveAttribute("placeholder");
  });

  it("conserve la clé enregistrée quand le champ reste vide", async () => {
    hasGristApiKey.value = true;
    gristUrl.value = "https://grist.example";
    await saveConnection({});

    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristUrl: "https://grist.example" });
  });

  it.each([
    ["une URL HTTP", { url: "http://grist.example", apiKey: "cle123" }, "HTTPS"],
    ["l'absence de clé", { url: "https://grist.example" }, "clé d'API Grist"],
  ])("refuse %s sans appeler l'API", async (_, values, message) => {
    await saveConnection(values);

    expect(await screen.findByText(new RegExp(`Saisissez.*${message}`))).toBeInTheDocument();
    expect(updateGristSettings).not.toHaveBeenCalled();
  });

  it("supprime la clé enregistrée", async () => {
    hasGristApiKey.value = true;
    render(UserGristSettings);
    await fireEvent.click(screen.getByTestId("user-grist-api-key-remove"));

    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristApiKey: null });
  });
});

describe("UserGristSettings — accessibilité", () => {
  it("indique les obligations et le format des documents avant la saisie", () => {
    render(UserGristSettings);

    expect(screen.getByLabelText(/Adresse de l'instance Grist \(obligatoire\)/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/Clé d.API \(obligatoire\)/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/Identifiant du document \(obligatoire\)/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/Identifiant du document/)).toHaveAccessibleName(/6 à 64 lettres, chiffres, - ou _/);
  });

  it("rend la clé facultative lorsqu'une clé est déjà enregistrée", () => {
    hasGristApiKey.value = true;
    render(UserGristSettings);

    expect(screen.getByLabelText(/Clé d.API/)).toHaveAttribute("aria-required", "false");
    expect(screen.getByLabelText(/Clé d.API/)).not.toHaveAccessibleName(/obligatoire/);
  });

  it("associe les erreurs de connexion aux champs et place le focus sur le premier champ invalide", async () => {
    render(UserGristSettings);
    const urlInput = screen.getByLabelText(/Adresse de l'instance Grist/);
    const keyInput = screen.getByLabelText(/Clé d.API/);
    await fireEvent.update(urlInput, "http://grist.example");
    await fireEvent.click(screen.getByTestId("user-grist-connection-save"));

    expect(urlInput).toHaveAttribute("aria-invalid", "true");
    expect(urlInput).toHaveAccessibleDescription("Saisissez l'adresse HTTPS de l'instance Grist.");
    expect(keyInput).toHaveAttribute("aria-invalid", "true");
    expect(keyInput).toHaveAccessibleDescription("Saisissez votre clé d'API Grist.");
    expect(urlInput).toHaveFocus();
    expect(updateGristSettings).not.toHaveBeenCalled();

    await fireEvent.update(urlInput, "https://grist.example");
    await fireEvent.click(screen.getByTestId("user-grist-connection-save"));
    expect(urlInput).toHaveAttribute("aria-invalid", "false");
    expect(keyInput).toHaveFocus();
  });

  it.each(["", "court", "x".repeat(65)])(
    "signale un identifiant invalide et rend le champ immédiatement corrigeable (%s)",
    async (value) => {
      await submit(value);
      const input = screen.getByLabelText(/Identifiant du document/);

      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(/6 à 64 lettres, chiffres, - ou _/);
      expect(input).toHaveFocus();
      expect(updateGristSettings).not.toHaveBeenCalled();
    },
  );

  it("annonce l'enregistrement et garde le focus sans autoriser une deuxième soumission", async () => {
    let complete!: () => void;
    updateGristSettings.mockReturnValue(new Promise<void>((resolve) => (complete = resolve)));
    render(UserGristSettings);
    await fireEvent.update(screen.getByLabelText(/Identifiant du document/), "docBBBBBB2");
    const addButton = screen.getByTestId("user-grist-document-add");
    addButton.focus();
    await fireEvent.click(addButton);

    expect(addButton).toHaveFocus();
    expect(addButton).toBeEnabled();
    expect(addButton).toHaveAttribute("aria-disabled", "true");
    expect(addButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Enregistrement de votre configuration Grist…");
    await fireEvent.click(addButton);
    await fireEvent.click(screen.getByTestId("user-grist-document-remove"));
    expect(updateGristSettings).toHaveBeenCalledTimes(1);

    complete();
    await waitFor(() => expect(addButton).toHaveAttribute("aria-disabled", "false"));
    expect(addButton).toHaveFocus();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("nomme chaque retrait et déplace le focus vers l'ajout lorsque le document activé disparaît", async () => {
    updateGristSettings.mockImplementation(async () => {
      gristDocIds.value = [];
    });
    render(UserGristSettings);
    const removeButton = screen.getByRole("button", { name: "Retirer le document docAAAAAA1" });
    removeButton.focus();
    await fireEvent.click(removeButton);

    await waitFor(() => expect(screen.getByLabelText(/Identifiant du document/)).toHaveFocus());
    expect(removeButton).not.toBeInTheDocument();
  });

  it("déplace le focus vers la saisie de clé quand le bouton de suppression disparaît", async () => {
    hasGristApiKey.value = true;
    updateGristSettings.mockImplementation(async () => {
      hasGristApiKey.value = false;
    });
    render(UserGristSettings);
    const removeButton = screen.getByRole("button", { name: "Supprimer la clé" });
    removeButton.focus();
    await fireEvent.click(removeButton);

    await waitFor(() => expect(screen.getByLabelText(/Clé d.API/)).toHaveFocus());
    expect(removeButton).not.toBeInTheDocument();
  });

  it("respecte le déplacement du focus effectué pendant une suppression", async () => {
    let complete!: () => void;
    updateGristSettings.mockImplementation(
      () =>
        new Promise<void>(
          (resolve) =>
            (complete = () => {
              gristDocIds.value = [];
              resolve();
            }),
        ),
    );
    render(UserGristSettings);
    const removeButton = screen.getByRole("button", { name: "Retirer le document docAAAAAA1" });
    removeButton.focus();
    await fireEvent.click(removeButton);
    const urlInput = screen.getByLabelText(/Adresse de l'instance Grist/);
    urlInput.focus();
    complete();

    await waitFor(() => expect(removeButton).not.toBeInTheDocument());
    expect(urlInput).toHaveFocus();
  });

  it("conserve la nouvelle URL et la nouvelle clé saisies pendant un enregistrement", async () => {
    let complete!: () => void;
    updateGristSettings.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = () => {
            gristUrl.value = "https://submitted.example";
            hasGristApiKey.value = true;
            resolve();
          };
        }),
    );
    render(UserGristSettings);
    const urlInput = screen.getByLabelText(/Adresse de l'instance Grist/);
    const keyInput = screen.getByLabelText(/Clé d.API/);
    await fireEvent.update(urlInput, "https://submitted.example");
    await fireEvent.update(keyInput, "submitted-key");
    await fireEvent.click(screen.getByTestId("user-grist-connection-save"));
    await fireEvent.update(urlInput, "https://next.example");
    await fireEvent.update(keyInput, "next-key");
    keyInput.focus();
    complete();

    await waitFor(() => expect(addSuccessMessage).toHaveBeenCalled());
    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristUrl: "https://submitted.example", gristApiKey: "submitted-key" });
    expect(urlInput).toHaveValue("https://next.example");
    expect(keyInput).toHaveValue("next-key");
    expect(keyInput).toHaveFocus();
  });

  it("conserve le nouvel identifiant saisi pendant l'ajout d'un document", async () => {
    let complete!: () => void;
    updateGristSettings.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = () => {
            gristDocIds.value = ["docAAAAAA1", "docBBBBBB2"];
            resolve();
          };
        }),
    );
    render(UserGristSettings);
    const input = screen.getByLabelText(/Identifiant du document/);
    await fireEvent.update(input, "docBBBBBB2");
    await fireEvent.click(screen.getByTestId("user-grist-document-add"));
    await fireEvent.update(input, "docCCCCCC3");
    input.focus();
    complete();

    await waitFor(() => expect(addSuccessMessage).toHaveBeenCalled());
    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristDocIds: ["docAAAAAA1", "docBBBBBB2"] });
    expect(input).toHaveValue("docCCCCCC3");
    expect(input).toHaveFocus();
  });
});

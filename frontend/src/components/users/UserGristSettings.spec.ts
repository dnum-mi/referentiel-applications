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
    if (url !== undefined) await fireEvent.update(screen.getByLabelText("Adresse de l'instance Grist"), url);
    if (apiKey !== undefined) await fireEvent.update(screen.getByLabelText(/Clé d'API/), apiKey);
    await fireEvent.click(screen.getByTestId("user-grist-connection-save"));
  }

  it("propose grist.numerique.gouv.fr par défaut et masque la clé saisie", () => {
    render(UserGristSettings);
    expect(screen.getByLabelText("Adresse de l'instance Grist")).toHaveValue("https://grist.numerique.gouv.fr");
    expect(screen.getByLabelText(/Clé d'API/)).toHaveAttribute("type", "password");
  });

  it("enregistre l'URL et la clé, puis vide le champ de la clé", async () => {
    await saveConnection({ url: " https://grist.example ", apiKey: " cle123 " });

    await waitFor(() => expect(addSuccessMessage).toHaveBeenCalled());
    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristUrl: "https://grist.example", gristApiKey: "cle123" });
    expect(screen.getByLabelText(/Clé d'API/)).toHaveValue("");
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

    expect(await screen.findByTestId("user-grist-connection-error")).toHaveTextContent(message);
    expect(updateGristSettings).not.toHaveBeenCalled();
  });

  it("supprime la clé enregistrée", async () => {
    hasGristApiKey.value = true;
    render(UserGristSettings);
    await fireEvent.click(screen.getByTestId("user-grist-api-key-remove"));

    expect(updateGristSettings).toHaveBeenCalledExactlyOnceWith({ gristApiKey: null });
  });
});

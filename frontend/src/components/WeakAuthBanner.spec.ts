import { flushPromises } from "@vue/test-utils";
import { cleanup, fireEvent, render } from "@testing-library/vue";
import type { AuthLevelDto, ConfigDto } from "@/client";
import { setReauthLoopDetected } from "@/composables/use-auth-level";
import WeakAuthBanner from "./WeakAuthBanner.vue";

const { storeMock, configMock, signinStrongMock, addErrorMessageMock } = vi.hoisted(() => ({
  storeMock: { authLevel: undefined as AuthLevelDto | undefined, isAuthDowngraded: false },
  configMock: { value: {} as Partial<ConfigDto> },
  signinStrongMock: vi.fn(),
  addErrorMessageMock: vi.fn(),
}));

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    get authLevel() {
      return storeMock.authLevel;
    },
    get isAuthDowngraded() {
      return storeMock.isAuthDowngraded;
    },
  }),
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: addErrorMessageMock, addSuccessMessage: vi.fn() }),
}));
vi.mock("@/services/config", () => ({
  getConfig: () => Promise.resolve(configMock.value),
}));
vi.mock("@/services/authentication", () => ({
  signinStrong: () => signinStrongMock(),
}));

function downgraded(reason: AuthLevelDto["reason"], level: AuthLevelDto["level"] = "weak") {
  storeMock.authLevel = { level, downgraded: true, reason };
  storeMock.isAuthDowngraded = true;
}

/** Monte le bandeau et attend que `getConfig()` (onMounted) soit appliquée. */
async function renderLoaded() {
  const utils = render(WeakAuthBanner);
  await flushPromises();
  return utils;
}

describe("WeakAuthBanner (#1985)", () => {
  beforeEach(() => {
    storeMock.authLevel = undefined;
    storeMock.isAuthDowngraded = false;
    configMock.value = { authLevel: { reauth: { prompt: "login" } } };
    signinStrongMock.mockReset().mockResolvedValue(undefined);
    addErrorMessageMock.mockReset();
    setReauthLoopDetected(false);
  });
  afterEach(cleanup);

  it("reste invisible tant que la session n'est pas rétrogradée", async () => {
    const { queryByTestId } = await renderLoaded();
    expect(queryByTestId("weak-auth-banner")).not.toBeInTheDocument();
  });

  // Mode observation : niveau faible mais `downgraded` faux → aucun bandeau.
  it("reste invisible en mode observation même avec un niveau faible", async () => {
    storeMock.authLevel = { level: "weak", downgraded: false, reason: "weak-method" };
    const { queryByTestId } = await renderLoaded();
    expect(queryByTestId("weak-auth-banner")).not.toBeInTheDocument();
  });

  it("explique la limitation et propose la reconnexion pour un mode faible", async () => {
    downgraded("weak-method");
    const { getByTestId } = await renderLoaded();

    const banner = getByTestId("weak-auth-banner");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveTextContent("Connexion sans carte agent ni double authentification");
    expect(banner).toHaveTextContent("utilisateur standard");

    await fireEvent.click(getByTestId("weak-auth-reauth-btn"));
    expect(signinStrongMock).toHaveBeenCalledTimes(1);
  });

  it("n'expose jamais le rôle d'origine", async () => {
    downgraded("weak-method");
    const { getByTestId } = await renderLoaded();
    expect(getByTestId("weak-auth-banner")).not.toHaveTextContent(/Administrateur|Contributeur|Lecteur/);
  });

  it("adapte le texte à un claim absent", async () => {
    downgraded("claim-missing", "unknown");
    const { getByTestId } = await renderLoaded();
    expect(getByTestId("weak-auth-banner")).toHaveTextContent("non transmis par le fournisseur d'identité");
  });

  it("ne propose pas de reconnexion pour un fournisseur externe", async () => {
    configMock.value = { authLevel: { reauth: { prompt: "login" }, helpUrl: "https://intranet.example/aide" } };
    downgraded("untrusted-idp", "unknown");
    const { getByTestId, queryByTestId } = await renderLoaded();
    expect(getByTestId("weak-auth-banner")).toHaveTextContent("fournisseur d'identité externe");
    // Le lien d'aide prouve que la configuration (reconnexion activée) est bien appliquée.
    expect(getByTestId("weak-auth-help-link")).toBeInTheDocument();
    expect(queryByTestId("weak-auth-reauth-btn")).not.toBeInTheDocument();
  });

  it("masque le bouton quand la reconnexion forte est désactivée côté serveur", async () => {
    configMock.value = { authLevel: { reauth: null, helpUrl: "https://intranet.example/aide" } };
    downgraded("weak-method");
    const { getByTestId, queryByTestId } = await renderLoaded();
    expect(getByTestId("weak-auth-help-link")).toBeInTheDocument();
    expect(queryByTestId("weak-auth-reauth-btn")).not.toBeInTheDocument();
  });

  it("propose la page d'aide quand elle est configurée", async () => {
    configMock.value = { authLevel: { reauth: { prompt: "login" }, helpUrl: "https://intranet.example/aide" } };
    downgraded("weak-method");
    const { getByTestId } = await renderLoaded();
    expect(getByTestId("weak-auth-help-link")).toHaveAttribute("href", "https://intranet.example/aide");
  });

  it("affiche la variante « boucle » après une reconnexion restée faible", async () => {
    downgraded("weak-method");
    setReauthLoopDetected(true);
    const { getByTestId } = await renderLoaded();
    expect(getByTestId("weak-auth-banner")).toHaveTextContent("n'a pas été reconnue comme forte");
  });

  it("signale l'échec de la redirection et réactive le bouton", async () => {
    signinStrongMock.mockRejectedValue(new Error("network"));
    downgraded("weak-method");
    const { getByTestId } = await renderLoaded();

    await fireEvent.click(getByTestId("weak-auth-reauth-btn"));
    await flushPromises();

    expect(addErrorMessageMock).toHaveBeenCalledWith(expect.stringContaining("redirection"));
    expect(getByTestId("weak-auth-reauth-btn")).not.toBeDisabled();
  });
});

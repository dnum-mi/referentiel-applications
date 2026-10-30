import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, nextTick, reactive, ref } from "vue";
import UserProfilePage from "./UserProfilePage.vue";

afterEach(() => cleanup());

const { hasPermissions } = vi.hoisted(() => ({ hasPermissions: vi.fn() }));

vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions }) }));
const route = reactive({ query: { tab: "" } });
vi.mock("vue-router", () => ({ useRoute: () => route }));
beforeEach(() => {
  route.query.tab = "";
});

const renderPage = () =>
  render(UserProfilePage, {
    global: { stubs: { UserInfoTab: true, UserTokensTab: true, UserFollowTab: true, UserGristSettings: true } },
  });

describe("UserProfilePage — onglet Synchronisation Grist", () => {
  it("ouvre les jetons depuis le lien de rappel, y compris après navigation", async () => {
    route.query.tab = "tokens";
    renderPage();
    const tokens = screen.getByRole("tab", { name: "Mes tokens" });
    expect(tokens).toHaveAttribute("aria-selected", "true");
    await fireEvent.click(screen.getByRole("tab", { name: "Mes informations" }));
    route.query.tab = "";
    await nextTick();
    route.query.tab = "tokens";
    await waitFor(() => expect(tokens).toHaveAttribute("aria-selected", "true"));
  });
  it("affiche l'onglet avec la capacité GristSync", () => {
    hasPermissions.mockReturnValue(true);
    renderPage();

    expect(screen.getByRole("tab", { name: "Synchronisation Grist" })).toBeInTheDocument();
    expect(screen.getByTestId("user-profile-tab-grist")).toBeInTheDocument();
  });

  it("masque l'onglet sans la capacité GristSync", () => {
    hasPermissions.mockReturnValue(false);
    renderPage();

    expect(screen.queryByRole("tab", { name: "Synchronisation Grist" })).toBeNull();
    expect(screen.queryByTestId("user-profile-tab-grist")).toBeNull();
  });
});

describe("UserProfilePage — retrait de la permission Grist", () => {
  function renderProfile() {
    const allowed = ref(true);
    hasPermissions.mockImplementation(() => allowed.value);
    render(
      defineComponent({
        components: { UserProfilePage },
        template: '<button data-testid="other-action">Autre action</button><UserProfilePage />',
      }),
      {
        global: {
          stubs: {
            UserInfoTab: {
              setup() {
                const draft = ref("");
                return { draft };
              },
              template: '<input v-model="draft" aria-label="Brouillon informations" />',
            },
            UserTokensTab: true,
            UserFollowTab: true,
            UserGristSettings: { template: '<input aria-label="Identifiant du document Grist" />' },
          },
        },
      },
    );
    return allowed;
  }

  async function openGrist() {
    const tab = screen.getByRole("tab", { name: "Synchronisation Grist" });
    await fireEvent.click(tab);
    await waitFor(() => expect(tab).toHaveAttribute("aria-selected", "true"));
    return tab;
  }

  async function expectFirstTabSelected() {
    await waitFor(() => expect(screen.getByRole("tab", { name: "Mes informations" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByRole("tabpanel", { name: "Mes informations" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Synchronisation Grist" })).toBeNull();
  }

  it("revient au premier onglet et y restitue le focus si le champ Grist disparaît", async () => {
    const allowed = renderProfile();
    await openGrist();
    screen.getByRole("textbox", { name: "Identifiant du document Grist" }).focus();

    allowed.value = false;

    await expectFirstTabSelected();
    await waitFor(() => expect(screen.getByRole("tab", { name: "Mes informations" })).toHaveFocus());
  });

  it("restitue le focus si le bouton d'onglet Grist disparaît", async () => {
    const allowed = renderProfile();
    const grist = await openGrist();
    grist.focus();

    allowed.value = false;

    await expectFirstTabSelected();
    await waitFor(() => expect(screen.getByRole("tab", { name: "Mes informations" })).toHaveFocus());
  });

  it("conserve le focus extérieur au contenu retiré", async () => {
    const allowed = renderProfile();
    await openGrist();
    const otherAction = screen.getByTestId("other-action");
    otherAction.focus();

    allowed.value = false;

    await expectFirstTabSelected();
    expect(otherAction).toHaveFocus();
  });

  it("préserve un déplacement volontaire du focus pendant le retrait", async () => {
    const allowed = renderProfile();
    await openGrist();
    screen.getByRole("textbox", { name: "Identifiant du document Grist" }).focus();
    const firstTabFocus = vi.spyOn(screen.getByRole("tab", { name: "Mes informations" }), "focus");

    allowed.value = false;
    await nextTick();
    const focusCallsBeforeMoving = firstTabFocus.mock.calls.length;
    const otherAction = screen.getByTestId("other-action");
    otherAction.focus();
    await flushPromises();

    await expectFirstTabSelected();
    expect(otherAction).toHaveFocus();
    expect(firstTabFocus).toHaveBeenCalledTimes(focusCallsBeforeMoving);
  });

  it("ne crée pas un focus inattendu quand aucun contrôle n'était focalisé", async () => {
    const allowed = renderProfile();
    const grist = await openGrist();
    grist.blur();
    expect(document.body).toHaveFocus();

    allowed.value = false;

    await expectFirstTabSelected();
    await waitFor(() => expect(document.body).toHaveFocus());
  });

  it("conserve l'onglet actif quand il reste disponible", async () => {
    const allowed = renderProfile();
    const follow = screen.getByRole("tab", { name: "Mes abonnements" });
    await fireEvent.click(follow);
    follow.focus();

    allowed.value = false;
    await flushPromises();

    expect(follow).toHaveAttribute("aria-selected", "true");
    expect(follow).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Mes abonnements" })).toBeVisible();
  });

  it("permet de sélectionner Grist après deux cycles de retrait et de réattribution", async () => {
    const allowed = renderProfile();
    await openGrist();

    for (let cycle = 0; cycle < 2; cycle++) {
      screen.getByRole("textbox", { name: "Identifiant du document Grist" }).focus();
      allowed.value = false;
      await expectFirstTabSelected();
      expect(screen.queryByTestId("user-profile-tab-grist")).toBeNull();
      expect(screen.getAllByRole("tab")).toHaveLength(3);

      allowed.value = true;
      await flushPromises();
      const grist = await openGrist();
      expect(grist).toHaveFocus();
      expect(screen.getAllByRole("tab")).toHaveLength(4);
      expect(screen.getByRole("tabpanel", { name: "Synchronisation Grist" })).toHaveClass("fr-tabs__panel--selected");
    }
  });

  it("préserve l'instance et le brouillon d'un autre panneau pendant deux cycles", async () => {
    const allowed = renderProfile();
    const draft = screen.getByRole("textbox", { name: "Brouillon informations" });
    await fireEvent.update(draft, "Saisie à conserver");
    await openGrist();

    for (let cycle = 0; cycle < 2; cycle++) {
      allowed.value = false;
      await expectFirstTabSelected();
      expect(screen.getByRole("textbox", { name: "Brouillon informations" })).toBe(draft);
      expect(draft).toHaveValue("Saisie à conserver");
      allowed.value = true;
      await flushPromises();
      await openGrist();
      expect(draft).toBeInTheDocument();
      expect(draft).toHaveValue("Saisie à conserver");
    }
  });

  it("limite les flèches et les touches Home et End aux onglets autorisés", async () => {
    const allowed = renderProfile();
    allowed.value = false;
    await flushPromises();
    const first = screen.getByRole("tab", { name: "Mes informations" });
    const last = screen.getByRole("tab", { name: "Mes abonnements" });
    first.focus();

    await fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(last).toHaveAttribute("aria-selected", "true");
    expect(last).toHaveFocus();
    await fireEvent.keyDown(last, { key: "ArrowRight" });
    expect(first).toHaveFocus();
    await fireEvent.keyDown(first, { key: "End" });
    expect(last).toHaveFocus();
    await fireEvent.keyDown(last, { key: "Home" });
    expect(first).toHaveFocus();
    expect(screen.queryByRole("tab", { name: "Synchronisation Grist" })).toBeNull();

    allowed.value = true;
    await flushPromises();
    await fireEvent.keyDown(first, { key: "End" });
    expect(screen.getByRole("tab", { name: "Synchronisation Grist" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Synchronisation Grist" })).toHaveClass("fr-tabs__panel--selected");
  });
});

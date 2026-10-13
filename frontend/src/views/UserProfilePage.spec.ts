import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";
import UserProfilePage from "./UserProfilePage.vue";

afterEach(() => cleanup());

const { hasPermissions } = vi.hoisted(() => ({ hasPermissions: vi.fn() }));

vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions }) }));

const renderPage = () =>
  render(UserProfilePage, {
    global: { stubs: { UserInfoTab: true, UserTokensTab: true, UserFollowTab: true, UserGristSettings: true } },
  });

describe("UserProfilePage — onglet Synchronisation Grist", () => {
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
            UserInfoTab: true,
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
});

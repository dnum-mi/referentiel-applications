import { cleanup, render, screen } from "@testing-library/vue";
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

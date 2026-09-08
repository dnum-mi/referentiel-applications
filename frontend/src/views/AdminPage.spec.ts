import { cleanup, fireEvent, render, screen, within } from "@testing-library/vue";
import { Permission } from "@/client/types.gen";
import AdminPage from "./AdminPage.vue";

afterEach(() => cleanup());

const { hasPermissionsMock } = vi.hoisted(() => ({
  hasPermissionsMock: vi.fn(),
}));

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({ hasPermissions: hasPermissionsMock }),
}));

// AdminPage n'orchestre que le regroupement/filtrage : les onglets eux-mêmes sont stubbés,
// leur propre comportement étant couvert par leurs specs dédiées (ex. AdminCorrelationsTab.spec.ts).
const { stubTab } = vi.hoisted(() => ({ stubTab: { template: "<div />" } }));
vi.mock("@/components/admin/AdminUsersTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminOrganizationsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminActorsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminBusinessDivisionsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminPermsMatrixTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminMditCampaignsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminQualityCampaignsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminCorrelationsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminTagsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminLabelSourcesTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminTokensTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminBatchData.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminEmailLogsTab.vue", () => ({ default: stubTab }));
vi.mock("@/components/admin/AdminActionLogsTab.vue", () => ({ default: stubTab }));

describe("adminPage (#2419, regroupement en tuiles thématiques)", () => {
  afterEach(() => hasPermissionsMock.mockReset());

  it("un administrateur global voit les 3 tuiles et atterrit sur « Gestion des utilisateurs »", () => {
    hasPermissionsMock.mockReturnValue(true);
    render(AdminPage);

    expect(screen.getByTestId("admin-theme-tile-users-rights")).toBeInTheDocument();
    expect(screen.getByTestId("admin-theme-tile-campaigns")).toBeInTheDocument();
    expect(screen.getByTestId("admin-theme-tile-management")).toBeInTheDocument();

    const tabs = screen.getByTestId("admin-tabs");
    expect(within(tabs).getByRole("tab", { name: "Gestion des utilisateurs" })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: "Matrice des permissions" })).toBeInTheDocument();
    // Les onglets des autres thèmes ne sont pas mélangés dans la même barre.
    expect(within(tabs).queryByRole("tab", { name: /campagnes dette/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("panel-users")).toBeInTheDocument();
  });

  it("un utilisateur délégué QualityCampaignManage seul ne voit que la tuile « Campagnes » et son unique onglet", () => {
    hasPermissionsMock.mockImplementation((permissions: string[]) => permissions.includes(Permission.QUALITY_CAMPAIGN_MANAGE));
    render(AdminPage);

    expect(screen.queryByTestId("admin-theme-tile-users-rights")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-theme-tile-management")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-theme-tile-campaigns")).toBeInTheDocument();

    const tabs = screen.getByTestId("admin-tabs");
    expect(within(tabs).getByRole("tab", { name: "Campagnes de mise en qualité" })).toBeInTheDocument();
    expect(within(tabs).queryAllByRole("tab")).toHaveLength(1);
  });

  // #2446 : un administrateur de périmètre n'a plus GlobalAdminManage — il ne conserve que les
  // deux onglets dont le contenu se découpe par périmètre.
  it("un administrateur de périmètre ne voit que « Gestion des utilisateurs » et « Gestion des acteurs »", () => {
    hasPermissionsMock.mockImplementation((permissions: string[]) => permissions.includes(Permission.ADMIN_PANEL_MANAGE));
    render(AdminPage);

    expect(screen.getByTestId("admin-theme-tile-users-rights")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-theme-tile-campaigns")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-theme-tile-management")).not.toBeInTheDocument();

    const tabs = screen.getByTestId("admin-tabs");
    expect(within(tabs).getByRole("tab", { name: "Gestion des utilisateurs" })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: "Gestion des acteurs" })).toBeInTheDocument();
    expect(within(tabs).queryByRole("tab", { name: "Matrice des permissions" })).not.toBeInTheDocument();
    expect(within(tabs).queryByRole("tab", { name: "Gestion des organisations" })).not.toBeInTheDocument();
    expect(within(tabs).queryByRole("tab", { name: "Directions métier" })).not.toBeInTheDocument();
    expect(within(tabs).queryAllByRole("tab")).toHaveLength(2);
  });

  it("la description de la tuile n'annonce que les onglets réellement accessibles (#2446)", () => {
    hasPermissionsMock.mockImplementation((permissions: string[]) => permissions.includes(Permission.ADMIN_PANEL_MANAGE));
    render(AdminPage);

    const tile = screen.getByTestId("admin-theme-tile-users-rights");
    expect(tile).toHaveTextContent("Gestion des utilisateurs, Gestion des acteurs.");
    expect(tile).not.toHaveTextContent("matrice des permissions");
  });

  it("cliquer une tuile bascule les onglets affichés et réinitialise l'onglet actif", async () => {
    hasPermissionsMock.mockReturnValue(true);
    render(AdminPage);

    expect(screen.getByTestId("panel-users")).toBeInTheDocument();

    await fireEvent.click(screen.getByTestId("admin-theme-tile-management"));

    const tabs = screen.getByTestId("admin-tabs");
    expect(within(tabs).getByRole("tab", { name: "Gestions des tags" })).toBeInTheDocument();
    expect(within(tabs).queryByRole("tab", { name: "Gestion des utilisateurs" })).not.toBeInTheDocument();
    // Premier onglet du nouveau thème actif par défaut.
    expect(screen.getByTestId("panel-tags")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-users")).not.toBeInTheDocument();
  });

  it("revenir sur un thème déjà visité puis cliquer un onglet non-défaut affiche bien son panneau", async () => {
    // Non-régression : DsfrTabs assigne à chaque DsfrTabContent une position via un compteur
    // interne qui ne se réinitialise jamais tant que l'instance vit. Sans `:key` sur DsfrTabs,
    // revisiter un thème désynchronise ce compteur de `activeTab` et plus aucun panneau ne
    // s'affiche (cf. rapport utilisateur : clic Campagnes → Utilisateurs & droits → Directions
    // métier / Matrice des permissions = onglet vide).
    hasPermissionsMock.mockReturnValue(true);
    render(AdminPage);

    await fireEvent.click(screen.getByTestId("admin-theme-tile-campaigns"));
    await fireEvent.click(screen.getByTestId("admin-theme-tile-users-rights"));

    const tabs = screen.getByTestId("admin-tabs");
    await fireEvent.click(within(tabs).getByRole("tab", { name: "Directions métier" }));
    expect(screen.getByTestId("panel-business-divisions")).toBeInTheDocument();

    await fireEvent.click(within(tabs).getByRole("tab", { name: "Matrice des permissions" }));
    expect(screen.getByTestId("panel-app-perms-matrix")).toBeInTheDocument();
  });
});

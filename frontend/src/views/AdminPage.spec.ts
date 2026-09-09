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

  it("un utilisateur délégué MditCampaignManage seul ne voit que la tuile « Campagnes » et son unique onglet (#2608)", () => {
    hasPermissionsMock.mockImplementation((permissions: string[]) => permissions.includes(Permission.MDIT_CAMPAIGN_MANAGE));
    render(AdminPage);

    expect(screen.queryByTestId("admin-theme-tile-users-rights")).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-theme-tile-management")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-theme-tile-campaigns")).toBeInTheDocument();

    const tabs = screen.getByTestId("admin-tabs");
    expect(within(tabs).getByRole("tab", { name: "Campagnes dette IT" })).toBeInTheDocument();
    expect(within(tabs).queryAllByRole("tab")).toHaveLength(1);
  });

  // #2446 : un administrateur de périmètre n'a pas GlobalAdminManage — il ne conserve que les
  // deux onglets dont le contenu se découpe par périmètre (Utilisateurs, Acteurs).
  it("un administrateur de périmètre ne voit que « Gestion des utilisateurs » et « Gestion des acteurs »", () => {
    hasPermissionsMock.mockImplementation((permissions: string[]) => permissions.includes(Permission.ADMIN_PANEL_MANAGE));
    render(AdminPage);

    expect(screen.getByTestId("admin-theme-tile-users-rights")).toBeInTheDocument();
    // Sans capacité de campagne déléguée ni GlobalAdminManage, les tuiles « Campagnes » et
    // « Gestion » n'ont plus aucun onglet accessible : elles disparaissent, comme n'importe
    // quel thème vide (même règle pour les trois tuiles, pas de cas particulier).
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

  it("un ADMIN global sans MditCampaignManage ni QualityCampaignManage explicites voit Revue datasteward mais aucun onglet de campagne dédié (#2608)", async () => {
    // AdminPanelManage + GlobalAdminManage : un admin global « nu », sans capacité de campagne.
    hasPermissionsMock.mockImplementation(
      (permissions: string[]) =>
        permissions.includes(Permission.ADMIN_PANEL_MANAGE) || permissions.includes(Permission.GLOBAL_ADMIN_MANAGE),
    );
    render(AdminPage);

    await fireEvent.click(screen.getByTestId("admin-theme-tile-campaigns"));

    // La tuile « Campagnes » reste visible grâce à l'onglet « Revue datasteward » (GlobalAdminManage,
    // sans lien avec les deux capacités de campagne), mais aucun des deux onglets de campagne
    // dédiés ne doit apparaître.
    const tabs = screen.getByTestId("admin-tabs");
    expect(within(tabs).getByRole("tab", { name: "Revue datasteward" })).toBeInTheDocument();
    expect(within(tabs).queryByRole("tab", { name: "Campagnes dette IT" })).not.toBeInTheDocument();
    expect(within(tabs).queryByRole("tab", { name: "Campagnes de mise en qualité" })).not.toBeInTheDocument();
  });

  it("un admin SCOPÉ ne voit jamais l'onglet « Revue datasteward », même avec les deux capacités de campagne", async () => {
    // Ni AdminPanelManage seul ni les deux capacités de campagne n'incluent GlobalAdminManage :
    // exactement la situation d'un admin de périmètre auquel on a délégué les deux campagnes.
    hasPermissionsMock.mockImplementation(
      (permissions: string[]) =>
        permissions.includes(Permission.ADMIN_PANEL_MANAGE) ||
        permissions.includes(Permission.QUALITY_CAMPAIGN_MANAGE) ||
        permissions.includes(Permission.MDIT_CAMPAIGN_MANAGE),
    );
    render(AdminPage);

    await fireEvent.click(screen.getByTestId("admin-theme-tile-campaigns"));

    const tabs = screen.getByTestId("admin-tabs");
    expect(within(tabs).queryByRole("tab", { name: "Revue datasteward" })).not.toBeInTheDocument();
    // Les deux onglets de campagne restent bien accessibles, seule Revue datasteward est retirée.
    expect(within(tabs).getByRole("tab", { name: "Campagnes dette IT" })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: "Campagnes de mise en qualité" })).toBeInTheDocument();
  });

  it("un admin SCOPÉ sans QualityCampaignManage ni MditCampaignManage ne voit pas la tuile « Campagnes »", () => {
    // AdminPanelManage seul : ni capacité de campagne, ni GlobalAdminManage (donc pas global).
    hasPermissionsMock.mockImplementation((permissions: string[]) => permissions.includes(Permission.ADMIN_PANEL_MANAGE));
    render(AdminPage);

    expect(screen.queryByTestId("admin-theme-tile-campaigns")).not.toBeInTheDocument();
  });

  it("un admin SCOPÉ avec au moins une capacité de campagne voit la tuile « Campagnes »", () => {
    hasPermissionsMock.mockImplementation(
      (permissions: string[]) =>
        permissions.includes(Permission.ADMIN_PANEL_MANAGE) || permissions.includes(Permission.QUALITY_CAMPAIGN_MANAGE),
    );
    render(AdminPage);

    expect(screen.getByTestId("admin-theme-tile-campaigns")).toBeInTheDocument();
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

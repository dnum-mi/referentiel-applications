import { Permission, Roles } from "@prisma/client";
import {
  DELEGABLE_PERMISSIONS,
  principalToPermissions,
  roleToAppPermissions,
  roleToPermissions,
} from "./role-to-permissions";

// #2088 — l'onglet Technologies suit le schéma des autres onglets : pas de « lecture pour
// tous » globale (défait #2027). La lecture vient de la projection de rôle par application
// (READER+) ou de la matrice du type d'acteur ; un VISITOR non-acteur ne voit pas l'onglet.
describe("roleToPermissions / roleToAppPermissions — TechnologyRead", () => {
  it("VISITOR : aucune lecture Technologie (ni globale, ni par application)", () => {
    expect(roleToPermissions(Roles.VISITOR)).not.toContain(
      Permission.TechnologyRead,
    );
    expect(roleToAppPermissions(Roles.VISITOR)).toEqual([]);
  });

  it("READER : lecture Technologie via la projection par application, comme ActorRead", () => {
    const appPerms = roleToAppPermissions(Roles.READER);
    expect(appPerms).toContain(Permission.TechnologyRead);
    expect(appPerms).toContain(Permission.ActorRead);
  });
});

// #2446 — Un administrateur ayant un périmètre organisationnel n'administre que les utilisateurs
// et les acteurs de ce périmètre : les capacités transverses (`GlobalAdminManage`) ne lui sont
// pas accordées par son rôle.
describe("roleToPermissions — administrateur de périmètre", () => {
  it("un ADMIN sans périmètre porte les capacités transverses", () => {
    const permissions = roleToPermissions(Roles.ADMIN);
    expect(permissions).toContain(Permission.AdminPanelManage);
    expect(permissions).toContain(Permission.GlobalAdminManage);
  });

  it("un ADMIN scopé garde AdminPanelManage mais perd les capacités transverses", () => {
    const permissions = roleToPermissions(Roles.ADMIN, { scoped: true });
    expect(permissions).toContain(Permission.AdminPanelManage);
    expect(permissions).not.toContain(Permission.GlobalAdminManage);
  });

  it("les autres rôles ne sont pas affectés par le périmètre", () => {
    for (const role of [Roles.CONTRIBUTOR, Roles.READER, Roles.VISITOR]) {
      expect(roleToPermissions(role, { scoped: true })).toEqual(
        roleToPermissions(role),
      );
    }
  });

  it("principalToPermissions dérive le périmètre du principal", () => {
    expect(
      principalToPermissions({
        role: Roles.ADMIN,
        scopeOrganizationId: "org-1",
      }),
    ).not.toContain(Permission.GlobalAdminManage);

    expect(
      principalToPermissions({ role: Roles.ADMIN, scopeOrganizationId: null }),
    ).toContain(Permission.GlobalAdminManage);
  });
});

// #2608 — QualityCampaignManage et MditCampaignManage ne sont jamais accordées par défaut au
// rôle ADMIN, scopé ou non : contrairement aux autres permissions du socle Administrateur
// (dont `GlobalAdminManage`, cf. ci-dessus), elles doivent systématiquement être indiquées
// explicitement via additionalPermissions, y compris pour un administrateur global.
describe("roleToPermissions — gestion des campagnes non accordée par défaut à ADMIN", () => {
  it("ADMIN n'a ni QualityCampaignManage ni MditCampaignManage par défaut, scopé ou non", () => {
    for (const scoped of [false, true]) {
      const adminPermissions = roleToPermissions(Roles.ADMIN, { scoped });
      expect(adminPermissions).not.toContain(Permission.QualityCampaignManage);
      expect(adminPermissions).not.toContain(Permission.MditCampaignManage);
    }
  });

  it("les deux permissions restent déléguables explicitement (additionalPermissions)", () => {
    expect(DELEGABLE_PERMISSIONS).toContain(Permission.QualityCampaignManage);
    expect(DELEGABLE_PERMISSIONS).toContain(Permission.MditCampaignManage);
  });
});

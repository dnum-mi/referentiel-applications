import { Permission, Roles } from "@prisma/client";
import {
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
// et les acteurs de ce périmètre : les capacités transverses ne lui sont pas accordées par son
// rôle. `QualityCampaignManage` reste délégable individuellement (couche 2).
describe("roleToPermissions — administrateur de périmètre", () => {
  it("un ADMIN sans périmètre porte les capacités transverses", () => {
    const permissions = roleToPermissions(Roles.ADMIN);
    expect(permissions).toContain(Permission.AdminPanelManage);
    expect(permissions).toContain(Permission.GlobalAdminManage);
    expect(permissions).toContain(Permission.QualityCampaignManage);
  });

  it("un ADMIN scopé garde AdminPanelManage mais perd les capacités transverses", () => {
    const permissions = roleToPermissions(Roles.ADMIN, { scoped: true });
    expect(permissions).toContain(Permission.AdminPanelManage);
    expect(permissions).not.toContain(Permission.GlobalAdminManage);
    expect(permissions).not.toContain(Permission.QualityCampaignManage);
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

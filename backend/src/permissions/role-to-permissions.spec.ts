import { Permission, Roles } from "@prisma/client";
import { roleToAppPermissions, roleToPermissions } from "./role-to-permissions";

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

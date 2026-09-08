import { describe, expect, it } from "vitest";
import { buildNavItems, buildPublicNavItems } from "./nav-items";
import { routeNames } from "./route-names";

describe("navItems — menu principal", () => {
  it("intitule « Technologies » l'entrée qui mène à /fins-de-vie (#2413)", () => {
    // Non-régression de #2496 : la résolution de conflit d'une branche antérieure à
    // #2448 avait réécrit ce libellé en « Fin de vie », alors que le h1 de la page,
    // le titre de route (donc le plan du site) et l'onglet de fiche disent « Technologies ».
    const item = buildNavItems(false).find((navItem) => navItem.to.name === routeNames.ENDOFLIFE);

    expect(item?.text).toBe("Technologies");
  });

  it("expose les entrées du socle dans l'ordre attendu", () => {
    expect(buildNavItems(false).map((navItem) => navItem.text)).toEqual([
      "Accueil",
      "Applications",
      "Time",
      "Qualité Générale",
      "Technologies",
      "Signalements",
    ]);
  });

  it("n'ajoute « Modifications » qu'avec la permission d'administration (#2440)", () => {
    expect(buildNavItems(false).map((navItem) => navItem.text)).not.toContain("Modifications");

    const adminItems = buildNavItems(true);
    expect(adminItems.map((navItem) => navItem.text)).toContain("Modifications");
    expect(adminItems.at(-1)).toEqual({ to: { name: routeNames.HISTORY }, text: "Modifications" });
  });

  it("réduit le menu d'un visiteur non authentifié à l'accueil", () => {
    expect(buildPublicNavItems()).toEqual([{ to: { name: routeNames.ACCUEIL }, text: "Accueil" }]);
  });
});

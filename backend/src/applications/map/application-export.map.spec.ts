import { mapRelationsIn, mapRelationsOut } from "./application-export.map";
import type { ApplicationWithAllRelations } from "src/applications/types/application.type";

/**
 * L'export Excel des relations (#2287).
 *
 * Décision prise pour la corrélation : elle est exportée comme les autres
 * relations. Une corrélation n'existe qu'après acceptation explicite par un
 * administrateur ; elle est alors visible sur les deux fiches, et l'export
 * doit refléter ce que l'utilisateur voit. Le libellé « Est corrélée à »,
 * identique dans les deux sens, la distingue sans ambiguïté d'une dépendance
 * fonctionnelle. Ce test fige ce choix : le mapping étant générique, rien ne
 * signalerait une exclusion accidentelle.
 */
describe("export des relations", () => {
  const app = {
    id: "app-a",
    label: "Application A",
    relationsAsSource: [
      {
        type: "is_correlated_with",
        targetApplication: { id: "app-b", label: "Application B" },
      },
      {
        type: "is_part_of",
        targetApplication: { id: "app-c", label: "Application C" },
      },
    ],
    relationsAsTarget: [
      {
        type: "is_correlated_with",
        sourceApplication: { id: "app-z", label: "Application Z" },
      },
    ],
  } as unknown as ApplicationWithAllRelations;

  it("exporte la corrélation avec son libellé, au même titre que les autres relations", () => {
    const rows = mapRelationsOut(app);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      sourceId: "app-a",
      targetId: "app-b",
      type: "Est corrélée à",
    });
  });

  it("garde le même libellé vu depuis l'application cible", () => {
    // La relation est symétrique : contrairement aux autres types, le libellé
    // ne s'inverse pas selon le sens de lecture.
    const [row] = mapRelationsIn(app);

    expect(row).toMatchObject({
      sourceId: "app-z",
      targetId: "app-a",
      type: "Est corrélée à",
    });
  });

  it("conserve les libellés orientés des autres types", () => {
    const [, partOf] = mapRelationsOut(app);

    expect(partOf.type).toBe("Fait partie de");
  });
});

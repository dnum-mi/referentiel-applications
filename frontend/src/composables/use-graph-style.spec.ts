import { relationTypeLabels } from "@/constants/dictionary";
import { isDirectedRelation, useGraphStyles } from "./use-graph-style";

describe("useGraphStyles — arête de corrélation (#2287)", () => {
  const { edge } = useGraphStyles().getGraphStyles();

  it("donne un style d'arête propre à la corrélation", () => {
    expect(edge.is_correlated_with).toBeDefined();
    expect(edge.is_correlated_with.color).toBeTruthy();
    expect(edge.is_correlated_with.style).toBe("dashed");
  });

  it("distingue visuellement la corrélation des autres types", () => {
    const others = Object.entries(edge)
      .filter(([type]) => type !== "is_correlated_with")
      .map(([, style]) => `${style.color}|${style.style}`);

    expect(others).not.toContain(`${edge.is_correlated_with.color}|${edge.is_correlated_with.style}`);
  });

  it("apparaît dans la légende, qui est pilotée par le dictionnaire", () => {
    // La légende du graphe itère sur relationTypeLabels : sans cette entrée,
    // l'arête serait tracée sans être documentée.
    expect(Object.keys(edge)).toEqual(expect.arrayContaining(Object.keys(relationTypeLabels)));
    expect(relationTypeLabels.is_correlated_with).toBe("est corrélée à");
  });

  it("ne fléche pas la corrélation, qui n'a pas de direction métier", () => {
    // La paire est stockée en ordre canonique : une flèche suivrait l'ordre
    // des identifiants et laisserait croire à une orientation.
    expect(isDirectedRelation("is_correlated_with")).toBe(false);
  });

  it("garde la flèche sur les relations orientées", () => {
    expect(isDirectedRelation("is_part_of")).toBe(true);
    expect(isDirectedRelation("use_sso_of")).toBe(true);
  });
});

import {
  type EndoflifeRelease,
  matchRelease,
  parseEolDate,
  toEndoflifeProduct,
} from "./endoflife.utils";

const RELEASES: EndoflifeRelease[] = [
  { name: "26", isEol: false, eolFrom: "2029-04-30" },
  { name: "24", isEol: false, eolFrom: "2028-04-30" },
  { name: "20", isEol: false, eolFrom: "2026-04-30" },
  { name: "18", isEol: true, eolFrom: "2025-04-30" },
];

describe("endoflife.utils", () => {
  describe("toEndoflifeProduct", () => {
    it("normalise un nom de technologie en identifiant produit", () => {
      expect(toEndoflifeProduct("Node.js")).toBe("nodejs");
      expect(toEndoflifeProduct("PostgreSQL")).toBe("postgresql");
      expect(toEndoflifeProduct("  Vue.js  ")).toBe("vuejs");
    });
  });

  describe("matchRelease", () => {
    it("associe une version au cycle correspondant (préfixe major)", () => {
      expect(matchRelease(RELEASES, "20.11")?.name).toBe("20");
      expect(matchRelease(RELEASES, "18.0.0")?.name).toBe("18");
    });

    it("associe une version exactement égale au nom de cycle", () => {
      expect(matchRelease(RELEASES, "24")?.name).toBe("24");
    });

    it("renvoie null si aucun cycle ne correspond", () => {
      expect(matchRelease(RELEASES, "12.0")).toBeNull();
      expect(matchRelease(RELEASES, "")).toBeNull();
    });
  });

  describe("parseEolDate", () => {
    it("renvoie la date de fin de vie du cycle correspondant", () => {
      expect(parseEolDate(RELEASES, "20.11")).toEqual(new Date("2026-04-30"));
      expect(parseEolDate(RELEASES, "18.19.0")).toEqual(new Date("2025-04-30"));
    });

    it("renvoie null si la version ne correspond à aucun cycle", () => {
      expect(parseEolDate(RELEASES, "12.0")).toBeNull();
    });

    it("renvoie null si le cycle n'a pas de date de fin de vie", () => {
      const releases: EndoflifeRelease[] = [{ name: "1", eolFrom: null }];
      expect(parseEolDate(releases, "1.0")).toBeNull();
    });
  });
});

import {
  type EndoflifeProduct,
  type EndoflifeRelease,
  buildProductIndex,
  lookupProductSlug,
  matchRelease,
  normalizeProductKey,
  parseEolDate,
  parseEolInfo,
  toEndoflifeProduct,
} from "./endoflife.utils";

const RELEASES: EndoflifeRelease[] = [
  {
    name: "26",
    isEol: false,
    eolFrom: "2029-04-30",
    isEoas: false,
    eoasFrom: "2027-10-27",
    latest: { name: "26.7.0" },
  },
  {
    name: "24",
    isEol: false,
    eolFrom: "2028-04-30",
    isEoas: false,
    eoasFrom: "2026-10-20",
    latest: { name: "24.5.0" },
  },
  { name: "20", isEol: false, eolFrom: "2026-04-30" },
  { name: "18", isEol: true, eolFrom: "2025-04-30" },
];

const CATALOG: EndoflifeProduct[] = [
  {
    name: "nodejs",
    label: "Node.js",
    category: "framework",
    aliases: ["node"],
  },
  {
    name: "postgresql",
    label: "PostgreSQL",
    category: "db",
    aliases: ["postgres"],
  },
  {
    name: "mssqlserver",
    label: "Microsoft SQL Server",
    category: "db",
    aliases: ["mssql", "sql-server"],
  },
  { name: "dotnet", label: ".NET", category: "framework", aliases: [] },
];

describe("endoflife.utils", () => {
  describe("normalizeProductKey", () => {
    it("normalise un nom libre en clé de comparaison", () => {
      expect(normalizeProductKey("Node.js")).toBe("nodejs");
      expect(normalizeProductKey("  SQL Server  ")).toBe("sqlserver");
      expect(normalizeProductKey(".NET")).toBe("net");
    });
  });

  describe("toEndoflifeProduct (mode dégradé sans catalogue)", () => {
    it("normalise un nom de produit en identifiant endoflife.date", () => {
      expect(toEndoflifeProduct("Node.js")).toBe("nodejs");
      expect(toEndoflifeProduct("PostgreSQL")).toBe("postgresql");
      expect(toEndoflifeProduct("  Vue.js  ")).toBe("vuejs");
    });

    it("applique la table d'alias produit → slug", () => {
      expect(toEndoflifeProduct("SQL Server")).toBe("mssqlserver");
      expect(toEndoflifeProduct(".NET")).toBe("dotnet");
      expect(toEndoflifeProduct(".NET Core")).toBe("dotnet");
      expect(toEndoflifeProduct("Postgres")).toBe("postgresql");
    });
  });

  describe("buildProductIndex / lookupProductSlug", () => {
    const index = buildProductIndex(CATALOG);

    it("résout un produit par son slug, son label ou un alias officiel", () => {
      expect(lookupProductSlug(index, "nodejs")).toBe("nodejs");
      expect(lookupProductSlug(index, "Node.js")).toBe("nodejs");
      expect(lookupProductSlug(index, "node")).toBe("nodejs");
      expect(lookupProductSlug(index, "Microsoft SQL Server")).toBe(
        "mssqlserver",
      );
      expect(lookupProductSlug(index, "sql-server")).toBe("mssqlserver");
    });

    it("est insensible à la casse, aux espaces et à la ponctuation", () => {
      expect(lookupProductSlug(index, "  POSTGRES  ")).toBe("postgresql");
      expect(lookupProductSlug(index, "Postgre SQL")).toBe("postgresql");
    });

    it("conserve les alias internes en complément du catalogue", () => {
      expect(lookupProductSlug(index, ".NET Core")).toBe("dotnet");
      expect(lookupProductSlug(index, "SQL Server")).toBe("mssqlserver");
    });

    it("renvoie null pour un produit absent du catalogue", () => {
      expect(lookupProductSlug(index, "Logiciel Interne Maison")).toBeNull();
      expect(lookupProductSlug(index, "")).toBeNull();
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

    it("se replie sur le libellé commercial du cycle (ex. SQL Server)", () => {
      const releases: EndoflifeRelease[] = [
        { name: "16.0", label: "2022 'Dallas'" },
        { name: "15.0", label: "2019 'Aris/Seattle'", eolFrom: "2030-01-08" },
        { name: "13.0-sp3", label: "2016 SP3" },
      ];
      expect(matchRelease(releases, "2019")?.name).toBe("15.0");
      expect(matchRelease(releases, "2016 SP3")?.name).toBe("13.0-sp3");
      // Frontière : « 2019 » ne doit pas matcher un label « 20191 »
      expect(matchRelease([{ name: "x", label: "20191" }], "2019")).toBeNull();
      // Le nom de cycle reste prioritaire sur le label
      expect(matchRelease(releases, "16.0")?.name).toBe("16.0");
    });

    it("se replie sur le nom de code du cycle (ex. Debian)", () => {
      const releases: EndoflifeRelease[] = [
        { name: "13", codename: "trixie" },
        { name: "12", codename: "bookworm", eolFrom: "2028-06-30" },
      ];
      expect(matchRelease(releases, "Bookworm")?.name).toBe("12");
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

  describe("parseEolInfo", () => {
    it("extrait EOL, fin de support actif et dernière version du cycle", () => {
      expect(parseEolInfo(RELEASES, "24.1")).toEqual({
        eolDate: new Date("2028-04-30"),
        eoasDate: new Date("2026-10-20"),
        latestVersion: "24.5.0",
      });
    });

    it("renvoie des valeurs nulles pour les champs absents du cycle", () => {
      expect(parseEolInfo(RELEASES, "20.11")).toEqual({
        eolDate: new Date("2026-04-30"),
        eoasDate: null,
        latestVersion: null,
      });
    });

    it("renvoie tout à null si la version ne correspond à aucun cycle", () => {
      expect(parseEolInfo(RELEASES, "12.0")).toEqual({
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
      });
      expect(parseEolInfo(RELEASES, "")).toEqual({
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
      });
    });
  });
});

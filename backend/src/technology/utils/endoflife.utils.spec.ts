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
  withInternalAliases,
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
      // « Java » n'existe dans le catalogue que par distribution.
      expect(lookupProductSlug(index, "Java")).toBe("oracle-jdk");
      expect(lookupProductSlug(index, "OpenJDK")).toBe("eclipse-temurin");
    });

    it("renvoie null pour un produit absent du catalogue", () => {
      expect(lookupProductSlug(index, "Logiciel Interne Maison")).toBeNull();
      expect(lookupProductSlug(index, "")).toBeNull();
    });
  });

  describe("withInternalAliases", () => {
    it("ajoute les alias internes au produit cible, sans doublon ni mutation", () => {
      const catalog: EndoflifeProduct[] = [
        {
          name: "oracle-jdk",
          label: "Oracle JDK",
          category: "lang",
          aliases: ["oracle-java"],
        },
        {
          name: "postgresql",
          label: "PostgreSQL",
          category: "db",
          aliases: ["postgres"],
        },
        { name: "nodejs", label: "Node.js", category: "lang", aliases: [] },
      ];
      const served = withInternalAliases(catalog);
      // « Java » et « JDK » deviennent connus du formulaire, comme du backend.
      expect(served[0].aliases).toEqual(["oracle-java", "java", "jdk"]);
      // « postgres » figure déjà dans le catalogue : pas de doublon.
      expect(served[1].aliases).toEqual(["postgres"]);
      // Produit sans alias interne : même objet, non copié.
      expect(served[2]).toBe(catalog[2]);
      // Le catalogue d'origine (mis en cache) n'est pas modifié.
      expect(catalog[0].aliases).toEqual(["oracle-java"]);
    });

    it("ignore un alias dont le produit cible est absent du catalogue", () => {
      expect(withInternalAliases([])).toEqual([]);
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

    it("ignore un préfixe « v » devant la version (ex. Node.js)", () => {
      expect(matchRelease(RELEASES, "v20.11")?.name).toBe("20");
      expect(matchRelease(RELEASES, "V24")?.name).toBe("24");
      expect(matchRelease(RELEASES, "v")).toBeNull();
    });

    it("accepte un major seul quand un unique cycle le porte (ex. Tomcat)", () => {
      const releases: EndoflifeRelease[] = [
        { name: "11.0", label: "11.0" },
        { name: "10.1", label: "10.1" },
        { name: "9.0", label: "9.0", eolFrom: "2027-03-31" },
      ];
      expect(matchRelease(releases, "9")?.name).toBe("9.0");
    });

    it("ne tranche pas entre plusieurs cycles portant le même major", () => {
      // MySQL : « 8 » peut désigner 8.0 (fin de vie 2026) ou 8.4 (2032).
      const mysql: EndoflifeRelease[] = [
        { name: "9.6", label: "9.6" },
        { name: "8.4", label: "8.4 (LTS)", eolFrom: "2032-04-30" },
        { name: "8.0", label: "8.0 (LTS)", eolFrom: "2026-04-30" },
      ];
      expect(matchRelease(mysql, "8")).toBeNull();
      // Python : « 3 » ne doit pas hériter de la fin de vie du dernier cycle 3.x.
      const python: EndoflifeRelease[] = [
        { name: "3.14", label: "3.14", eolFrom: "2030-10-31" },
        { name: "3.13", label: "3.13", eolFrom: "2029-10-31" },
      ];
      expect(matchRelease(python, "3")).toBeNull();
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
    it("extrait EOL, fin de support actif, dernière version et cycle apparié", () => {
      expect(parseEolInfo(RELEASES, "24.1")).toEqual({
        eolDate: new Date("2028-04-30"),
        eoasDate: new Date("2026-10-20"),
        latestVersion: "24.5.0",
        cycle: "24",
      });
    });

    it("renvoie des valeurs nulles pour les champs absents du cycle", () => {
      expect(parseEolInfo(RELEASES, "20.11")).toEqual({
        eolDate: new Date("2026-04-30"),
        eoasDate: null,
        latestVersion: null,
        cycle: "20",
      });
    });

    // #2449 : un cycle reconnu qui ne publie aucune échéance (Apache 2.4) garde son
    // nom de cycle, seule trace qui le distingue d'une version non reconnue.
    it("renvoie le cycle apparié même quand il ne publie aucune échéance", () => {
      expect(parseEolInfo([{ name: "2.4" }], "2.4.58")).toEqual({
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
        cycle: "2.4",
      });
    });

    it("renvoie tout à null, cycle compris, si la version ne correspond à aucun cycle", () => {
      expect(parseEolInfo(RELEASES, "12.0")).toEqual({
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
        cycle: null,
      });
      expect(parseEolInfo(RELEASES, "")).toEqual({
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
        cycle: null,
      });
    });
  });
});

// #2527 : numérotations Java héritées.
describe("matchRelease — numérotations Java (#2527)", () => {
  const jdk = [
    { name: "8", eolFrom: "2030-12-31" },
    { name: "11", eolFrom: "2032-01-31" },
    { name: "17", eolFrom: "2029-09-30" },
    { name: "21", eolFrom: "2031-09-30" },
  ];

  it.each([
    ["1.8", "8"],
    ["1.8.0_392", "8"],
    ["8u392", "8"],
    ["17u45", "17"],
    ["v1.8", "8"],
  ])("apparie « %s » au cycle « %s »", (version, cycle) => {
    expect(matchRelease(jdk, version)?.name).toBe(cycle);
  });

  it("ne bascule vers le schéma hérité que si le cycle existe", () => {
    expect(matchRelease(jdk, "1.9")).toBeNull();
    expect(matchRelease(jdk, "9u10")).toBeNull();
  });

  it("préfère toujours un cycle nommé exactement comme la saisie", () => {
    const releases = [
      { name: "1.8", eolFrom: "2027-01-01" },
      { name: "8", eolFrom: "2030-12-31" },
    ];
    expect(matchRelease(releases, "1.8")?.name).toBe("1.8");
  });
});

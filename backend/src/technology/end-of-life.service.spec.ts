import { PrismaService } from "src/prisma/prisma.service";
import { EndOfLifeService } from "./end-of-life.service";
import { EOL_SOON_MS } from "./utils/eol-status";

const day = 24 * 60 * 60 * 1000;
const past = new Date(Date.now() - 10 * day);
const soon = new Date(Date.now() + 30 * day);
const far = new Date(Date.now() + EOL_SOON_MS + 30 * day);

const makeService = () => {
  const paginate = jest.fn().mockResolvedValue({ results: [], total: 0 });
  const prisma = { application: { paginate } } as unknown as PrismaService;
  return { service: new EndOfLifeService(prisma), paginate };
};

describe("EndOfLifeService — construction de la requête", () => {
  it("ne retient que les applications portant au moins une technologie concernée", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({});
    const { where, include } = paginate.mock.calls[0][0];
    expect(where.technologies.some).toBeDefined();
    // Les technologies restituées sont filtrées comme la sélection : afficher
    // toute la stack noierait les lignes concernées dans les lignes saines.
    expect(include.technologies.where).toEqual(where.technologies.some);
  });

  it("filtre sur le chemin ou le sigle de l'organisation d'un acteur", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({ organization: "MI/DNUM" });
    const { where } = paginate.mock.calls[0][0];
    expect(where.actors.some.organization.OR).toEqual([
      { path: { contains: "MI/DNUM", mode: "insensitive" } },
      { sigle: { contains: "MI/DNUM", mode: "insensitive" } },
    ]);
  });

  /**
   * Le filtre produit doit vivre DANS le même `some` que le filtre de statut.
   * Deux `some` séparés seraient satisfaits par deux lignes différentes : une
   * application dont le PostgreSQL est à jour remonterait sur « PostgreSQL »
   * au seul prétexte qu'une autre de ses technologies est en fin de vie.
   */
  it("combine la recherche produit et le statut dans une seule condition", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({ search: "PostgreSQL" });
    const { where } = paginate.mock.calls[0][0];
    const productClause = where.OR.find(
      (clause: Record<string, unknown>) => "technologies" in clause,
    );
    expect(productClause.technologies.some.AND).toEqual([
      where.technologies.some,
      { product: { contains: "PostgreSQL", mode: "insensitive" } },
    ]);
  });

  it("cherche aussi dans le libellé et le sigle de l'application", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({ search: "refapp" });
    const { where } = paginate.mock.calls[0][0];
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { label: { contains: "refapp", mode: "insensitive" } },
        { shortName: { contains: "refapp", mode: "insensitive" } },
      ]),
    );
  });

  it("trie par libellé par défaut, et honore un tri explicite", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({});
    expect(paginate.mock.calls[0][0].orderBy).toEqual({ label: "asc" });
    await service.findApplications({ sortBy: "shortName", order: "desc" });
    expect(paginate.mock.calls[1][0].orderBy).toEqual({ shortName: "desc" });
  });
});

describe("EndOfLifeService — restitution", () => {
  const application = {
    id: "app-1",
    label: "Référentiel des applications",
    shortName: "REFAPP",
    technologies: [
      {
        id: "t-eoas",
        technology: "Runtime",
        product: "Node.js",
        version: "20",
        eolDate: far,
        eoasDate: past,
        latestVersion: "20.19.5",
      },
      {
        id: "t-eol",
        technology: "Base de données",
        product: "PostgreSQL",
        version: "13",
        eolDate: past,
        eoasDate: null,
        latestVersion: "15.5",
      },
      {
        id: "t-soon",
        technology: "Langage",
        product: "Python",
        version: "3.9",
        eolDate: soon,
        eoasDate: null,
        latestVersion: "3.13",
      },
    ],
    actors: [
      { organization: { path: "MI/DNUM/SDIT" } },
      { organization: { path: "MI/DNUM/SDIT" } },
      { organization: null },
      { organization: { path: "MI/DNUM" } },
    ],
  };

  const run = async () => {
    const { service, paginate } = makeService();
    paginate.mockResolvedValue({ results: [application], total: 1 });
    const page = await service.findApplications({});
    return page.results[0];
  };

  it("trie les technologies par gravité décroissante", async () => {
    const result = await run();
    expect(result.technologies.map((t) => t.id)).toEqual([
      "t-eol",
      "t-soon",
      "t-eoas",
    ]);
    expect(result.technologies.map((t) => t.status)).toEqual([
      "eol",
      "eol-soon",
      "eoas-passed",
    ]);
  });

  it("expose le statut le plus grave comme synthèse", async () => {
    expect((await run()).worstStatus).toBe("eol");
  });

  // Les organisations viennent des acteurs : plusieurs acteurs partagent
  // souvent la même, et certains n'en ont aucune.
  it("dédoublonne et trie les organisations, en ignorant les acteurs sans organisation", async () => {
    expect((await run()).organizationPaths).toEqual([
      "MI/DNUM",
      "MI/DNUM/SDIT",
    ]);
  });

  it("sérialise les dates en ISO et préserve le total", async () => {
    const { service, paginate } = makeService();
    paginate.mockResolvedValue({ results: [application], total: 42 });
    const page = await service.findApplications({});
    expect(page.total).toBe(42);
    expect(page.results[0].technologies[0].eolDate).toBe(past.toISOString());
    expect(page.results[0].technologies[0].eoasDate).toBeNull();
  });
});

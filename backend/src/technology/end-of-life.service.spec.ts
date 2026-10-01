import { ForbiddenException } from "@nestjs/common";
import { Permission, Roles } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { delegateToService } from "src/permissions/delegated-auth";
import type { Requestor } from "src/user/entities/user.entity";
import { EndOfLifeService } from "./end-of-life.service";
import { EOL_SOON_MS } from "./utils/eol-status";

const day = 24 * 60 * 60 * 1000;
const past = new Date(Date.now() - 10 * day);
const soon = new Date(Date.now() + 30 * day);
const far = new Date(Date.now() + EOL_SOON_MS + 30 * day);

const organization = (path: string) => ({
  id: `org-${path}`,
  path,
  sigle: null,
  url: null,
  parentId: null,
  businessDivisionId: null,
});

const makeRequestor = (overrides: Partial<Requestor> = {}): Requestor => ({
  id: "user-1",
  email: "user@example.com",
  role: Roles.ADMIN,
  organizationId: null,
  scopeOrganizationId: null,
  type: "human",
  isBlocked: false,
  additionalPermissions: [Permission.TechnologyList],
  permissions: [],
  ...overrides,
});

const scopedRequestor = (role: Roles, path: string) => {
  const scopeOrganization = organization(path);
  return makeRequestor({
    role,
    scopeOrganizationId: scopeOrganization.id,
    scopeOrganization,
  });
};

const makeService = () => {
  const paginate = jest.fn().mockResolvedValue({ results: [], total: 0 });
  const prisma = { application: { paginate } } as unknown as PrismaService;
  return { service: new EndOfLifeService(prisma), paginate };
};

describe("EndOfLifeService — construction de la requête", () => {
  it("ne retient que les applications portant au moins une technologie concernée", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({}, makeRequestor());
    const { where, include } = paginate.mock.calls[0][0];
    expect(where.technologies.some).toBeDefined();
    // Les technologies restituées sont filtrées comme la sélection : afficher
    // toute la stack noierait les lignes concernées dans les lignes saines.
    expect(include.technologies.where).toEqual(where.technologies.some);
  });

  it("filtre sur le chemin ou le sigle de l'organisation d'un acteur", async () => {
    const { service, paginate } = makeService();
    await service.findApplications(
      { organization: "MI/DNUM" },
      makeRequestor(),
    );
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
    await service.findApplications({ search: "PostgreSQL" }, makeRequestor());
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
    await service.findApplications({ search: "refapp" }, makeRequestor());
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
    await service.findApplications({}, makeRequestor());
    expect(paginate.mock.calls[0][0].orderBy).toEqual({ label: "asc" });
    await service.findApplications(
      { sortBy: "shortName", order: "desc" },
      makeRequestor(),
    );
    expect(paginate.mock.calls[1][0].orderBy).toEqual({ shortName: "desc" });
  });

  // Seul filtre non partitionnant : la restriction disparaît, y compris pour les
  // technologies saines — cf. eol-status.spec.ts.
  it("lève la restriction sur les technologies avec le filtre « all »", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({ status: "all" }, makeRequestor());
    const { where, include } = paginate.mock.calls[0][0];
    expect(where.technologies.some).toEqual({});
    expect(include.technologies.where).toEqual({});
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
        eolSource: "endoflife",
      },
      {
        id: "t-eol",
        technology: "Base de données",
        product: "PostgreSQL",
        version: "13",
        eolDate: past,
        eoasDate: null,
        latestVersion: "15.5",
        eolSource: "endoflife",
      },
      {
        id: "t-soon",
        technology: "Logiciel interne",
        product: "Outil maison",
        version: "2",
        eolDate: soon,
        eoasDate: null,
        latestVersion: null,
        eolSource: "manual",
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
    const page = await service.findApplications({}, makeRequestor());
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

  // #2454 : une date saisie à la main est classée comme une date calculée ; seule son
  // origine est restituée, pour que la vue puisse la signaler.
  it("restitue l'origine de chaque date sans changer le classement", async () => {
    const result = await run();
    expect(result.technologies.map((t) => t.eolSource)).toEqual([
      "endoflife",
      "manual",
      "endoflife",
    ]);
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
    const page = await service.findApplications({}, makeRequestor());
    expect(page.total).toBe(42);
    expect(page.results[0].technologies[0].eolDate).toBe(past.toISOString());
    expect(page.results[0].technologies[0].eoasDate).toBeNull();
  });
});

describe("EndOfLifeService — technologies saines (filtre « all »)", () => {
  // Fixture dédiée : ne pas ajouter cette ligne à `application` ci-dessus casserait
  // les assertions d'ordre/longueur des tests de restitution existants.
  const healthyTechnology = {
    id: "t-healthy",
    technology: "Runtime",
    product: "Node.js",
    version: "22",
    eolDate: null,
    eoasDate: null,
    latestVersion: "22.10.0",
    eolSource: "endoflife",
  };

  it("restitue null, jamais « eol », pour une technologie sans fin de vie connue", async () => {
    const { service, paginate } = makeService();
    paginate.mockResolvedValue({
      results: [
        {
          id: "app-healthy",
          label: "Application saine",
          shortName: null,
          technologies: [healthyTechnology],
          actors: [],
        },
      ],
      total: 1,
    });
    const page = await service.findApplications(
      { status: "all" },
      makeRequestor(),
    );
    expect(page.results[0].technologies[0].status).toBeNull();
    expect(page.results[0].worstStatus).toBeNull();
  });

  it("trie une technologie saine après les trois statuts de fin de vie", async () => {
    const { service, paginate } = makeService();
    paginate.mockResolvedValue({
      results: [
        {
          id: "app-mixed",
          label: "Application mixte",
          shortName: null,
          technologies: [
            healthyTechnology,
            {
              id: "t-eol",
              technology: "Base de données",
              product: "PostgreSQL",
              version: "13",
              eolDate: past,
              eoasDate: null,
              latestVersion: "15.5",
              eolSource: "endoflife",
            },
          ],
          actors: [],
        },
      ],
      total: 1,
    });
    const page = await service.findApplications(
      { status: "all" },
      makeRequestor(),
    );
    expect(page.results[0].technologies.map((t) => t.id)).toEqual([
      "t-eol",
      "t-healthy",
    ]);
    expect(page.results[0].worstStatus).toBe("eol");
  });
});

describe("EndOfLifeService — applications supprimées (#2515)", () => {
  it("exclut les applications marquées supprimées de la vue transverse et de son total", async () => {
    const { service, paginate } = makeService();
    await service.findApplications({}, makeRequestor());
    const { where } = paginate.mock.calls[0][0];
    expect(where.currentStatus).toEqual({ status: { not: "deleted" } });
    expect(where.technologies.some).toBeDefined();
  });
});

describe("EndOfLifeService — périmètre fonctionnel (#2801)", () => {
  it.each([Roles.READER, Roles.CONTRIBUTOR, Roles.ADMIN])(
    "%s sans périmètre conserve une vue globale",
    async (role) => {
      const { service, paginate } = makeService();
      await service.findApplications({}, makeRequestor({ role }));
      const { where } = paginate.mock.calls[0][0];
      expect(where.AND).toBeUndefined();
      expect(where.currentStatus).toEqual({ status: { not: "deleted" } });
    },
  );

  it.each([Roles.READER, Roles.CONTRIBUTOR, Roles.ADMIN])(
    "%s avec périmètre limite acteurs et directions métier à l'organisation exacte et ses descendants",
    async (role) => {
      const { service, paginate } = makeService();
      await service.findApplications({}, scopedRequestor(role, "MI/DNUM/"));
      const scopedOrganization = {
        OR: [
          { path: { equals: "MI/DNUM", mode: "insensitive" } },
          { path: { startsWith: "MI/DNUM/", mode: "insensitive" } },
        ],
      };
      expect(paginate.mock.calls[0][0].where.AND).toEqual([
        {
          OR: [
            { actors: { some: { organization: scopedOrganization } } },
            {
              businessDivisions: {
                some: { organizations: { some: scopedOrganization } },
              },
            },
          ],
        },
      ]);
    },
  );

  it("les filtres libres et les droits d'acteur ne peuvent pas élargir le périmètre", async () => {
    const { service, paginate } = makeService();
    const requestor = scopedRequestor(Roles.CONTRIBUTOR, "MI/DNUM");
    await service.findApplications({}, requestor);
    const scope = paginate.mock.calls[0][0].where.AND;

    await service.findApplications(
      { status: "all", organization: "AUTRE", search: "PostgreSQL" },
      {
        ...requestor,
        organizationId: "org-AUTRE",
        organization: organization("AUTRE"),
        appPerms: [Permission.TechnologyRead, Permission.TechnologyWrite],
      },
    );

    const { where } = paginate.mock.calls[1][0];
    expect(where.AND).toEqual(scope);
    expect(where.actors.some.organization.OR).toContainEqual({
      path: { contains: "AUTRE", mode: "insensitive" },
    });
    expect(where.OR).toContainEqual({
      label: { contains: "PostgreSQL", mode: "insensitive" },
    });
    expect(where.technologies.some).toEqual({});
  });

  it.each([undefined, null, organization("")])(
    "refuse un périmètre enregistré dont la relation ou le chemin manque (%p)",
    async (scopeOrganization) => {
      const { service, paginate } = makeService();
      const requestor = makeRequestor({
        scopeOrganizationId: "org-scope",
        scopeOrganization,
      });
      await expect(service.findApplications({}, requestor)).rejects.toThrow(
        ForbiddenException,
      );
      expect(paginate).not.toHaveBeenCalled();
    },
  );

  it.each([
    makeRequestor({ role: Roles.VISITOR }),
    scopedRequestor(Roles.VISITOR, "MI/DNUM"),
  ])("refuse un visiteur même avec la capacité (%p)", async (requestor) => {
    const { service, paginate } = makeService();
    await expect(service.findApplications({}, requestor)).rejects.toThrow(
      ForbiddenException,
    );
    expect(paginate).not.toHaveBeenCalled();
  });

  it.each([
    ["MI", "MI/DNUM", "MI/DNUM"],
    ["MI/DNUM", "MI", "MI/DNUM"],
    [null, "MI/DNUM", "MI/DNUM"],
    ["MI/DNUM", null, "MI/DNUM"],
  ])(
    "respecte le périmètre effectif d'un accès délégué (humain %s, service %s)",
    async (humanScope, serviceScope, expectedScope) => {
      const { service, paginate } = makeService();
      const human = humanScope
        ? scopedRequestor(Roles.ADMIN, humanScope)
        : makeRequestor();
      const serviceUser = {
        ...(serviceScope
          ? scopedRequestor(Roles.READER, serviceScope)
          : makeRequestor({ role: Roles.READER })),
        type: "bot" as const,
      };
      const effectiveRequestor = delegateToService(human, serviceUser);

      await service.findApplications({ status: "all" }, effectiveRequestor);

      const scope = paginate.mock.calls[0][0].where.AND[0];
      expect(scope.OR[0].actors.some.organization.OR).toEqual([
        { path: { equals: expectedScope, mode: "insensitive" } },
        { path: { startsWith: `${expectedScope}/`, mode: "insensitive" } },
      ]);
    },
  );
});

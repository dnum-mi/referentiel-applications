// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
// Sans incidence ici : toutes les dépendances de TechnologyService sont mockées.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

// Appel réseau vers endoflife.date, mocké pour les cas du rafraîchissement paresseux.
const resolveProductReleases = jest.fn();

jest.mock("./utils/endoflife.utils", () => ({
  ...jest.requireActual("./utils/endoflife.utils"),
  resolveProductReleases: (product: string) => resolveProductReleases(product),
}));

import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApplicationService } from "src/applications/application.service";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { TechnologyService } from "./technology.service";

const makeSearchServiceMock = () => ({
  scheduleRefresh: jest.fn<
    ReturnType<ApplicationSearchService["scheduleRefresh"]>,
    Parameters<ApplicationSearchService["scheduleRefresh"]>
  >(),
});

// Saisir une technologie dont le couple technologie/produit est déjà présent
// dans la fiche doit mettre à jour la ligne existante (version, lien
// documentaire), pas créer un doublon — et le rapprochement doit ignorer la
// casse (« postgresql » ≡ « PostgreSQL »).
describe("TechnologyService — upsert de la stack technique", () => {
  const existing = {
    id: "tech-1",
    applicationId: "app-1",
    technology: "Base de données",
    product: "PostgreSQL",
    version: "15.5",
    docUrl: null,
  };

  const makeService = () => {
    const technologyStack = {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(existing),
      delete: jest
        .fn<Promise<typeof existing>, [unknown]>()
        .mockResolvedValue(existing),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const prisma = {
      technologyStack,
      application: {
        findUnique: jest.fn().mockResolvedValue({ id: "app-1" }),
      },
    };
    const applicationService = {
      updateApplicationQuality: jest.fn(),
      recordQualityCampaignActions: jest
        .fn<
          ReturnType<ApplicationService["recordQualityCampaignActions"]>,
          Parameters<ApplicationService["recordQualityCampaignActions"]>
        >()
        .mockResolvedValue(undefined),
    };
    const searchService = makeSearchServiceMock();
    const service = new TechnologyService(
      prisma as unknown as PrismaService,
      {} as MetadatasService,
      applicationService as unknown as ApplicationService,
      searchService as unknown as ApplicationSearchService,
    );
    return { service, prisma, searchService };
  };

  it("crée une nouvelle ligne quand le couple technologie/produit est absent", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findFirst.mockResolvedValue(null);

    await service.createTechnology("app-1", {
      technology: "Langage",
      product: "Node.js",
      version: "20.11",
    });

    expect(prisma.technologyStack.create).toHaveBeenCalledTimes(1);
    expect(prisma.technologyStack.update).not.toHaveBeenCalled();
    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it("met à jour la ligne existante (pas de doublon) quand on saisit une nouvelle version d'un couple déjà présent", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findFirst.mockResolvedValue(existing);

    await service.createTechnology("app-1", {
      technology: "Base de données",
      product: "PostgreSQL",
      version: "15",
    });

    expect(prisma.technologyStack.create).not.toHaveBeenCalled();
    expect(prisma.technologyStack.update).toHaveBeenCalledTimes(1);
    const updateArgs = prisma.technologyStack.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: existing.id });
    expect(updateArgs.data.version).toEqual("15");
    // La graphie déjà enregistrée est conservée : l'upsert ne réécrit ni la
    // technologie ni le produit de la ligne existante.
    expect(updateArgs.data.technology).toBeUndefined();
    expect(updateArgs.data.product).toBeUndefined();
    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it("rapproche le couple technologie/produit sans tenir compte de la casse", async () => {
    const { service, prisma } = makeService();
    prisma.technologyStack.findFirst.mockResolvedValue(existing);

    await service.createTechnology("app-1", {
      technology: "base de données",
      product: "postgresql",
      version: "15.6",
    });

    expect(prisma.technologyStack.findFirst).toHaveBeenCalledWith({
      where: {
        applicationId: "app-1",
        technology: { equals: "base de données", mode: "insensitive" },
        product: { equals: "postgresql", mode: "insensitive" },
      },
    });
    expect(prisma.technologyStack.create).not.toHaveBeenCalled();
    expect(prisma.technologyStack.update).toHaveBeenCalledTimes(1);
  });

  it("PATCH : rejette en conflit un renommage vers un couple déjà présent, à la casse près", async () => {
    const { service, prisma, searchService } = makeService();
    const other = { ...existing, id: "tech-2", product: "MySQL" };
    prisma.technologyStack.findUnique.mockResolvedValue(other);
    prisma.technologyStack.findFirst.mockResolvedValue(existing);

    await expect(
      service.updateTechnology("tech-2", "app-1", { product: "postgresql" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.technologyStack.update).not.toHaveBeenCalled();
    expect(searchService.scheduleRefresh).not.toHaveBeenCalled();
  });

  it("PATCH : changer uniquement la casse d'un produit sur la même ligne n'est pas un conflit", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findUnique.mockResolvedValue(existing);

    await service.updateTechnology("tech-1", "app-1", {
      product: "postgresql",
    });

    // Pas de recherche de conflit : le couple (à la casse près) est inchangé.
    expect(prisma.technologyStack.findFirst).not.toHaveBeenCalled();
    expect(prisma.technologyStack.update).toHaveBeenCalledTimes(1);
    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it("rafraîchit l'index après une suppression, même sans options de métadonnées", async () => {
    const { service, prisma, searchService } = makeService();

    await service.deleteTechnology("tech-1", "app-1");

    expect(prisma.technologyStack.delete).toHaveBeenCalledWith({
      where: { id: "tech-1" },
    });
    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it("rafraîchit l'index quand une fusion POST efface la version omise", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findFirst.mockResolvedValue(existing);

    await service.createTechnology("app-1", {
      technology: existing.technology,
      product: existing.product,
    });

    expect(
      prisma.technologyStack.update.mock.calls[0][0].data.version,
    ).toBeNull();
    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    { manualEolDate: "2027-06-30" },
    { docUrl: "https://example.com/documentation" },
  ])(
    "ne réindexe pas une modification hors produit/version : %p",
    async (dto) => {
      const { service, prisma, searchService } = makeService();

      await service.updateTechnology("tech-1", "app-1", dto);

      expect(prisma.technologyStack.update).toHaveBeenCalledTimes(1);
      expect(searchService.scheduleRefresh).not.toHaveBeenCalled();
    },
  );

  it("ne réindexe pas une fusion POST qui conserve les champs indexés", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findFirst.mockResolvedValue(existing);

    await service.createTechnology("app-1", {
      technology: existing.technology,
      product: existing.product,
      version: existing.version,
      manualEolDate: "2027-06-30",
    });

    expect(prisma.technologyStack.update).toHaveBeenCalledTimes(1);
    expect(searchService.scheduleRefresh).not.toHaveBeenCalled();
  });

  it.each(["création", "fusion", "modification", "suppression"] as const)(
    "ne réindexe pas après un échec de %s",
    async (operation) => {
      const { service, prisma, searchService } = makeService();
      const error = new Error("écriture refusée");
      const dto = {
        technology: existing.technology,
        product: existing.product,
        version: "16",
      };
      let result: Promise<unknown>;
      if (operation === "création") {
        prisma.technologyStack.findFirst.mockResolvedValue(null);
        prisma.technologyStack.create.mockRejectedValue(error);
        result = service.createTechnology("app-1", dto);
      } else if (operation === "fusion") {
        prisma.technologyStack.findFirst.mockResolvedValue(existing);
        prisma.technologyStack.update.mockRejectedValue(error);
        result = service.createTechnology("app-1", dto);
      } else if (operation === "modification") {
        prisma.technologyStack.update.mockRejectedValue(error);
        result = service.updateTechnology("tech-1", "app-1", dto);
      } else {
        prisma.technologyStack.delete.mockRejectedValue(error);
        result = service.deleteTechnology("tech-1", "app-1");
      }

      await expect(result).rejects.toThrow(error);
      expect(searchService.scheduleRefresh).not.toHaveBeenCalled();
    },
  );

  // #2379 : effacer la version (null) ne doit pas recalculer l'EOL avec l'ancienne version.
  it("recalcule l'EOL avec version=null quand la version est effacée", async () => {
    const { service } = makeService();
    const resolveEol = jest
      .spyOn(
        service as unknown as {
          resolveEol: (...args: unknown[]) => Promise<unknown>;
        },
        "resolveEol",
      )
      .mockResolvedValue({});

    await service.updateTechnology("tech-1", "app-1", {
      version: null,
    } as never);

    expect(resolveEol).toHaveBeenCalledWith("PostgreSQL", null);
  });

  it("garde la version existante quand la version est omise du dto", async () => {
    const { service } = makeService();
    const resolveEol = jest
      .spyOn(
        service as unknown as {
          resolveEol: (...args: unknown[]) => Promise<unknown>;
        },
        "resolveEol",
      )
      .mockResolvedValue({});

    await service.updateTechnology("tech-1", "app-1", {
      product: "PostgreSQL",
    });

    expect(resolveEol).toHaveBeenCalledWith("PostgreSQL", "15.5");
  });
});

// #2449 : le cycle apparié est persisté pour que la fiche distingue une version
// que endoflife.date ne reconnaît pas (« MySQL 8 » : cycles 8.0 et 8.4, aucune
// date) d'un cycle connu qui ne publie aucune échéance (Apache 2.4). Les dates
// nulles seules ne font pas la différence.
describe("TechnologyService — champs de fin de vie persistés", () => {
  type EolFields = {
    eolFieldsFrom: (
      resolution: unknown,
      version?: string | null,
    ) => Record<string, unknown>;
  };
  const releases = [
    { name: "8.4", eolFrom: "2032-04-30", latest: { name: "8.4.3" } },
    { name: "8.0", eolFrom: "2026-04-30", latest: { name: "8.0.40" } },
  ];
  const makeService = () =>
    new TechnologyService(
      {} as PrismaService,
      {} as MetadatasService,
      {} as ApplicationService,
      makeSearchServiceMock() as unknown as ApplicationSearchService,
    ) as unknown as EolFields;

  it("persiste le cycle apparié avec les dates d'une version reconnue", () => {
    const fields = makeService().eolFieldsFrom(
      { status: "resolved", slug: "mysql", releases },
      "8.0.36",
    );
    expect(fields).toEqual({
      eolProduct: "mysql",
      eolDate: new Date("2026-04-30"),
      eoasDate: null,
      latestVersion: "8.0.40",
      eolCycle: "8.0",
      eolCheckedAt: expect.any(Date),
    });
  });

  it("écrit eolCycle null et des dates nulles pour une version qui ne désigne aucun cycle", () => {
    const fields = makeService().eolFieldsFrom(
      { status: "resolved", slug: "mysql", releases },
      "8",
    );
    expect(fields).toEqual({
      eolProduct: "mysql",
      eolDate: null,
      eoasDate: null,
      latestVersion: null,
      eolCycle: null,
      eolCheckedAt: expect.any(Date),
    });
  });

  it("écrit eolCycle null pour un produit non suivi", () => {
    const fields = makeService().eolFieldsFrom(
      { status: "unknown-product" },
      "1.0",
    );
    expect(fields).toMatchObject({ eolProduct: null, eolCycle: null });
    expect(fields.eolCheckedAt).toBeInstanceOf(Date);
  });

  it("n'écrit rien quand endoflife.date est indisponible", () => {
    expect(
      makeService().eolFieldsFrom({ status: "unavailable" }, "8.0"),
    ).toEqual({});
  });
});

// #2454 : quand endoflife.date ne répond pas ou ne connaît pas le produit, le
// gestionnaire saisit la date à la main. Elle est persistée avec son origine et
// l'automatique ne l'écrase jamais ; seul son effacement (null) rend la main au calcul.
describe("TechnologyService — fin de vie saisie à la main (#2454)", () => {
  const automaticRow = {
    id: "tech-1",
    applicationId: "app-1",
    technology: "Base de données",
    product: "PostgreSQL",
    version: "15.5",
    docUrl: null,
    eolSource: "endoflife",
    eolProduct: "postgresql",
    eolDate: new Date("2026-11-13"),
    eolCheckedAt: new Date(),
  };
  const manualRow = {
    ...automaticRow,
    id: "tech-2",
    product: "Outil maison",
    version: "2",
    eolSource: "manual",
    eolProduct: null,
    eolDate: new Date("2027-06-30"),
  };
  const resolved = {
    eolProduct: "postgresql",
    eolDate: new Date("2026-11-13"),
    eoasDate: null,
    latestVersion: "15.8",
    eolCycle: "15",
    eolCheckedAt: new Date(),
  };

  type ResolveEol = { resolveEol: (...args: unknown[]) => Promise<unknown> };

  const makeService = (existing: Record<string, unknown>) => {
    const technologyStack = {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(existing),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const prisma = {
      technologyStack,
      application: {
        findUnique: jest.fn().mockResolvedValue({ id: "app-1" }),
      },
    };
    const service = new TechnologyService(
      prisma as unknown as PrismaService,
      {} as MetadatasService,
      { updateApplicationQuality: jest.fn() } as unknown as ApplicationService,
      makeSearchServiceMock() as unknown as ApplicationSearchService,
    );
    const resolveEol = jest
      .spyOn(service as unknown as ResolveEol, "resolveEol")
      .mockResolvedValue(resolved);
    return { service, prisma, resolveEol };
  };

  const expectManualFields = (data: Record<string, unknown>) => {
    expect(data).toMatchObject({
      eolSource: "manual",
      eolDate: new Date("2027-06-30"),
      eoasDate: null,
      eolProduct: null,
      eolCycle: null,
      latestVersion: null,
    });
    expect(data.eolCheckedAt).toBeInstanceOf(Date);
    // `manualEolDate` n'est pas une colonne : Prisma rejetterait la requête.
    expect(data).not.toHaveProperty("manualEolDate");
  };

  beforeEach(() => resolveProductReleases.mockReset());

  it("POST : persiste la date manuelle avec son origine, sans appeler endoflife.date", async () => {
    const { service, prisma, resolveEol } = makeService(automaticRow);

    await service.createTechnology("app-1", {
      technology: "Logiciel interne",
      product: "Outil maison",
      version: "2",
      manualEolDate: "2027-06-30",
    });

    expect(resolveEol).not.toHaveBeenCalled();
    expect(prisma.technologyStack.create).toHaveBeenCalledTimes(1);
    expectManualFields(prisma.technologyStack.create.mock.calls[0][0].data);
  });

  it("POST sur un couple déjà présent : la date manuelle remplace la fin de vie de la ligne existante", async () => {
    const { service, prisma, resolveEol } = makeService(automaticRow);
    prisma.technologyStack.findFirst.mockResolvedValue(automaticRow);

    await service.createTechnology("app-1", {
      technology: "Base de données",
      product: "PostgreSQL",
      version: "15.5",
      manualEolDate: "2027-06-30",
    });

    expect(resolveEol).not.toHaveBeenCalled();
    expect(prisma.technologyStack.create).not.toHaveBeenCalled();
    expectManualFields(prisma.technologyStack.update.mock.calls[0][0].data);
  });

  it("POST : une date qui passe la forme ISO mais n'est pas calendaire est refusée en 400, jamais en 500", async () => {
    const { service, prisma } = makeService(automaticRow);

    await expect(
      service.createTechnology("app-1", {
        technology: "Logiciel interne",
        product: "Outil maison",
        version: "2",
        // Forme ISO 8601 « semaine », acceptée par IsDateString mais illisible par Date.
        manualEolDate: "2027-W10",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.technologyStack.create).not.toHaveBeenCalled();
  });

  // Le formulaire d'ajout n'affiche jamais la date manuelle d'une ligne existante : son
  // « null » (champ proposé mais vide) ne doit pas effacer une saisie que l'utilisateur
  // n'a pas vue. Seule l'édition, qui la montre, peut la retirer.
  it("POST sur un couple déjà présent : null ne détruit pas la saisie manuelle existante", async () => {
    const { service, prisma, resolveEol } = makeService(manualRow);
    prisma.technologyStack.findFirst.mockResolvedValue(manualRow);

    await service.createTechnology("app-1", {
      technology: "Logiciel interne",
      product: "outil maison",
      version: "3",
      manualEolDate: null,
    });

    expect(resolveEol).not.toHaveBeenCalled();
    const data = prisma.technologyStack.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ version: "3" });
    expect(data).not.toHaveProperty("eolSource");
    expect(data).not.toHaveProperty("eolDate");
  });

  it("PATCH : la date manuelle remplace la fin de vie automatique, sans appeler endoflife.date", async () => {
    const { service, prisma, resolveEol } = makeService(automaticRow);

    await service.updateTechnology("tech-1", "app-1", {
      manualEolDate: "2027-06-30",
    });

    expect(resolveEol).not.toHaveBeenCalled();
    expectManualFields(prisma.technologyStack.update.mock.calls[0][0].data);
  });

  it("PATCH : effacer la saisie (null) rend la main à l'automatique et force la résolution, même sans changement de produit ni de version", async () => {
    const { service, prisma, resolveEol } = makeService(manualRow);

    await service.updateTechnology("tech-2", "app-1", {
      docUrl: "https://example.org/outil-maison",
      manualEolDate: null,
    });

    expect(resolveEol).toHaveBeenCalledWith("Outil maison", "2");
    const { data } = prisma.technologyStack.update.mock.calls[0][0];
    expect(data).toMatchObject({ eolSource: "endoflife", ...resolved });
    expect(data).not.toHaveProperty("manualEolDate");
  });

  // Sans cette remise à zéro, la date saisie resterait affichée comme si elle venait
  // du calcul automatique : la ligne doit redevenir « non vérifiée », retentée plus tard.
  it("PATCH : effacer la saisie quand endoflife.date ne répond pas laisse la ligne « non vérifiée »", async () => {
    const { service, prisma, resolveEol } = makeService(manualRow);
    resolveEol.mockResolvedValue({});

    await service.updateTechnology("tech-2", "app-1", { manualEolDate: null });

    expect(prisma.technologyStack.update.mock.calls[0][0].data).toEqual({
      eolSource: "endoflife",
      eolProduct: null,
      eolDate: null,
      eoasDate: null,
      latestVersion: null,
      eolCycle: null,
      eolCheckedAt: null,
    });
  });

  it("PATCH : sans manualEolDate, une ligne manuelle garde sa fin de vie même si produit et version changent", async () => {
    const { service, prisma, resolveEol } = makeService(manualRow);

    await service.updateTechnology("tech-2", "app-1", {
      product: "Outil maison v2",
      version: "3",
    });

    expect(resolveEol).not.toHaveBeenCalled();
    const { data } = prisma.technologyStack.update.mock.calls[0][0];
    expect(data).toEqual({ product: "Outil maison v2", version: "3" });
  });

  it("PATCH : sans manualEolDate, une ligne automatique est recalculée quand la version change", async () => {
    const { service, prisma, resolveEol } = makeService(automaticRow);

    await service.updateTechnology("tech-1", "app-1", { version: "16" });

    expect(resolveEol).toHaveBeenCalledWith("PostgreSQL", "16");
    expect(prisma.technologyStack.update.mock.calls[0][0].data).toMatchObject(
      resolved,
    );
  });

  it("PATCH : sans manualEolDate ni changement de produit ou de version, une ligne automatique n'est pas recalculée", async () => {
    const { service, prisma, resolveEol } = makeService(automaticRow);

    await service.updateTechnology("tech-1", "app-1", {
      docUrl: "https://www.postgresql.org/docs/",
    });

    expect(resolveEol).not.toHaveBeenCalled();
    expect(prisma.technologyStack.update.mock.calls[0][0].data).toEqual({
      docUrl: "https://www.postgresql.org/docs/",
    });
  });

  it("GET : le rafraîchissement paresseux ne recalcule ni ne réécrit une ligne manuelle, même périmée", async () => {
    const { service, prisma, resolveEol } = makeService(automaticRow);
    resolveEol.mockRestore();
    // Appels endoflife.date coupés en test : on les rétablit pour ce seul cas.
    jest
      .spyOn(
        service as unknown as { eolDisabled: () => boolean },
        "eolDisabled",
      )
      .mockReturnValue(false);
    resolveProductReleases.mockResolvedValue({ status: "unknown-product" });
    const longAgo = new Date(0);
    prisma.technologyStack.findMany.mockResolvedValue([
      { ...manualRow, eolCheckedAt: longAgo },
      { ...automaticRow, eolCheckedAt: longAgo },
    ]);

    const rows = await service.findAllByApplicationId("app-1");

    expect(resolveProductReleases).toHaveBeenCalledTimes(1);
    expect(resolveProductReleases).toHaveBeenCalledWith("PostgreSQL");
    expect(prisma.technologyStack.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.technologyStack.updateMany.mock.calls[0][0].where).toEqual({
      id: "tech-1",
      eolSource: "endoflife",
    });
    expect(rows[0]).toMatchObject({
      id: "tech-2",
      eolSource: "manual",
      eolDate: new Date("2027-06-30"),
    });
  });
});

// #2516 : quand produit ou version changent pendant une panne d'endoflife.date, l'ancienne
// fin de vie ne doit pas survivre au changement — la ligne repasse « jamais vérifiée ».
describe("TechnologyService — changement de produit pendant une panne (#2516)", () => {
  const row = {
    id: "tech-1",
    applicationId: "app-1",
    technology: "Base de données",
    product: "PostgreSQL",
    version: "13",
    docUrl: null,
    eolSource: "endoflife",
    eolProduct: "postgresql",
    eolCycle: "13",
    eolDate: new Date("2025-11-13"),
    eoasDate: null,
    latestVersion: "13.20",
    eolCheckedAt: new Date(),
  };
  const neverChecked = {
    eolProduct: null,
    eolDate: null,
    eoasDate: null,
    latestVersion: null,
    eolCycle: null,
    eolCheckedAt: null,
  };

  type ResolveEol = { resolveEol: (...args: unknown[]) => Promise<unknown> };

  const makeService = (resolution: Record<string, unknown>) => {
    const technologyStack = {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(row),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
    };
    const prisma = {
      technologyStack,
      application: {
        findUnique: jest.fn().mockResolvedValue({ id: "app-1" }),
      },
    };
    const service = new TechnologyService(
      prisma as unknown as PrismaService,
      {} as MetadatasService,
      { updateApplicationQuality: jest.fn() } as unknown as ApplicationService,
      makeSearchServiceMock() as unknown as ApplicationSearchService,
    );
    jest
      .spyOn(service as unknown as ResolveEol, "resolveEol")
      .mockResolvedValue(resolution);
    return { service, update: technologyStack.update };
  };

  it("PATCH produit pendant une panne : les champs de fin de vie repassent « jamais vérifiée »", async () => {
    const { service, update } = makeService({});
    await service.updateTechnology("tech-1", "app-1", { product: "MySQL" });
    expect(update.mock.calls[0][0].data).toMatchObject({
      product: "MySQL",
      ...neverChecked,
    });
  });

  it("PATCH version pendant une panne : même remise à zéro", async () => {
    const { service, update } = makeService({});
    await service.updateTechnology("tech-1", "app-1", { version: "16" });
    expect(update.mock.calls[0][0].data).toMatchObject({
      version: "16",
      ...neverChecked,
    });
  });

  it("PATCH sans changement de produit ni de version : la fin de vie existante est conservée", async () => {
    const { service, update } = makeService({});
    await service.updateTechnology("tech-1", "app-1", {
      docUrl: "https://example.org",
    });
    expect(update.mock.calls[0][0].data).toEqual({
      docUrl: "https://example.org",
    });
  });

  it("PATCH produit avec une résolution réussie : les nouveaux champs écrasent la remise à zéro", async () => {
    const resolved = {
      eolProduct: "mysql",
      eolCycle: "8.0",
      eolDate: new Date("2026-04-30"),
      eoasDate: null,
      latestVersion: "8.0.40",
      eolCheckedAt: new Date(),
    };
    const { service, update } = makeService(resolved);
    await service.updateTechnology("tech-1", "app-1", { product: "MySQL" });
    expect(update.mock.calls[0][0].data).toMatchObject({
      product: "MySQL",
      ...resolved,
    });
  });

  it("PATCH qui efface la date manuelle ET change le produit pendant une panne : remise à zéro, retour à l'automatique", async () => {
    const { service, update } = makeService({});
    await service.updateTechnology("tech-1", "app-1", {
      product: "MySQL",
      manualEolDate: null,
    });
    expect(update.mock.calls[0][0].data).toMatchObject({
      product: "MySQL",
      eolSource: "endoflife",
      ...neverChecked,
    });
  });
});

// #2527 : hygiène — conflit d'index rendu 409, statut calculé côté backend, écriture paresseuse
// conditionnée à l'origine.
describe("TechnologyService — hygiène (#2527)", () => {
  const row = {
    id: "tech-1",
    applicationId: "app-1",
    technology: "Base de données",
    product: "PostgreSQL",
    version: "13",
    docUrl: null,
    eolSource: "endoflife",
    eolProduct: "postgresql",
    eolCycle: "13",
    eolDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    eoasDate: null,
    latestVersion: null,
    eolCheckedAt: new Date(),
  };
  const makeService = () => {
    const technologyStack = {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([row]),
      findUnique: jest.fn().mockResolvedValue(row),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const prisma = {
      technologyStack,
      application: { findUnique: jest.fn().mockResolvedValue({ id: "app-1" }) },
    };
    const searchService = makeSearchServiceMock();
    const service = new TechnologyService(
      prisma as unknown as PrismaService,
      {} as MetadatasService,
      { updateApplicationQuality: jest.fn() } as unknown as ApplicationService,
      searchService as unknown as ApplicationSearchService,
    );
    return { service, technologyStack, searchService };
  };

  it("rend 409 quand l'index unique refuse un doublon de casse en course (P2002)", async () => {
    const { service, technologyStack } = makeService();
    technologyStack.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(
      service.createTechnology("app-1", {
        technology: "Base de données",
        product: "PostgreSQL",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("laisse remonter toute autre erreur Prisma", async () => {
    const { service, technologyStack } = makeService();
    technologyStack.create.mockRejectedValue(new Error("connexion perdue"));
    await expect(
      service.createTechnology("app-1", {
        technology: "Base de données",
        product: "PostgreSQL",
      }),
    ).rejects.toThrow("connexion perdue");
  });

  it("expose le statut de fin de vie calculé à la lecture", async () => {
    const { service } = makeService();
    const [first] = await service.findAllByApplicationId("app-1");
    expect((first as unknown as { eolStatus: string }).eolStatus).toBe("eol");
  });

  it("conditionne l'écriture paresseuse à une origine automatique", async () => {
    const { service, technologyStack, searchService } = makeService();
    // Appels endoflife.date coupés en test : rétablis pour ce seul cas.
    jest
      .spyOn(
        service as unknown as { eolDisabled: () => boolean },
        "eolDisabled",
      )
      .mockReturnValue(false);
    technologyStack.findMany.mockResolvedValue([
      { ...row, eolCheckedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    ]);
    resolveProductReleases.mockResolvedValue({
      status: "resolved",
      slug: "postgresql",
      releases: [{ name: "13", eolFrom: "2025-11-13" }],
    });
    await service.findAllByApplicationId("app-1");
    expect(technologyStack.updateMany.mock.calls[0][0].where).toEqual({
      id: "tech-1",
      eolSource: "endoflife",
    });
    expect(searchService.scheduleRefresh).not.toHaveBeenCalled();
  });
});

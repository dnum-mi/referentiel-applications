// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
// Sans incidence ici : toutes les dépendances de TechnologyService sont mockées.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import { ConflictException } from "@nestjs/common";
import { ApplicationService } from "src/applications/application.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { TechnologyService } from "./technology.service";

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
    };
    const prisma = {
      technologyStack,
      application: {
        findUnique: jest.fn().mockResolvedValue({ id: "app-1" }),
      },
    };
    const applicationService = { updateApplicationQuality: jest.fn() };
    const service = new TechnologyService(
      prisma as unknown as PrismaService,
      {} as MetadatasService,
      applicationService as unknown as ApplicationService,
    );
    return { service, prisma };
  };

  it("crée une nouvelle ligne quand le couple technologie/produit est absent", async () => {
    const { service, prisma } = makeService();
    prisma.technologyStack.findFirst.mockResolvedValue(null);

    await service.createTechnology("app-1", {
      technology: "Langage",
      product: "Node.js",
      version: "20.11",
    });

    expect(prisma.technologyStack.create).toHaveBeenCalledTimes(1);
    expect(prisma.technologyStack.update).not.toHaveBeenCalled();
  });

  it("met à jour la ligne existante (pas de doublon) quand on saisit une nouvelle version d'un couple déjà présent", async () => {
    const { service, prisma } = makeService();
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
    const { service, prisma } = makeService();
    const other = { ...existing, id: "tech-2", product: "MySQL" };
    prisma.technologyStack.findUnique.mockResolvedValue(other);
    prisma.technologyStack.findFirst.mockResolvedValue(existing);

    await expect(
      service.updateTechnology("tech-2", "app-1", { product: "postgresql" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.technologyStack.update).not.toHaveBeenCalled();
  });

  it("PATCH : changer uniquement la casse d'un produit sur la même ligne n'est pas un conflit", async () => {
    const { service, prisma } = makeService();
    prisma.technologyStack.findUnique.mockResolvedValue(existing);

    await service.updateTechnology("tech-1", "app-1", {
      product: "postgresql",
    });

    // Pas de recherche de conflit : le couple (à la casse près) est inchangé.
    expect(prisma.technologyStack.findFirst).not.toHaveBeenCalled();
    expect(prisma.technologyStack.update).toHaveBeenCalledTimes(1);
  });

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

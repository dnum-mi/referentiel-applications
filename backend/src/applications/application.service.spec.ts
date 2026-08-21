// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
// Sans incidence ici : toutes les dépendances de ApplicationService sont mockées.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

jest.mock("src/common/utils/quality.utils", () => ({
  calculateIQ: jest.fn().mockResolvedValue(75),
}));

import type { Prisma } from "@prisma/client";
import { calculateIQ } from "src/common/utils/quality.utils";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import { ApplicationService } from "./application.service";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { ApplicationSearchService } from "./search/application-search.service";

describe("ApplicationService.search — recherche full-text (param q)", () => {
  const emptyResult = { results: [], total: 0, averageIq: 0 };
  const requestor = { email: "user@example.com" } as unknown as Requestor;

  const setup = (
    fullTextIds: string[] = ["app-x"],
    matching: { id: string; quality: number | null }[] = [],
  ) => {
    const applicationRepository = {
      findApplications: jest.fn().mockResolvedValue(emptyResult),
      findMatchingApplications: jest.fn().mockResolvedValue(matching),
      findApplicationsPage: jest.fn().mockResolvedValue([]),
    };
    const prismaQueryBuilder = {
      // Un nouvel objet à chaque appel : le service y pousse le filtre `id IN`.
      buildSearchWhere: jest.fn().mockImplementation(async () => ({
        AND: [] as Prisma.ApplicationWhereInput[],
      })),
      buildOrderBy: jest.fn().mockReturnValue({}),
      isRawSort: jest.fn().mockReturnValue(false),
      sortApplicationIdsRaw: jest.fn().mockResolvedValue([]),
    };
    const applicationSearchService = {
      fullTextSearch: jest
        .fn()
        .mockResolvedValue(
          fullTextIds.map((id, i) => ({ id, rank: 1 - i / 10 })),
        ),
      fullTextSearchPrefix: jest
        .fn()
        .mockResolvedValue(
          fullTextIds.map((id, i) => ({ id, rank: 1 - i / 10 })),
        ),
    };
    const checkPermissions = {
      can: jest.fn().mockResolvedValue(true),
    };

    const service = new ApplicationService(
      {} as unknown as PrismaService,
      applicationRepository as unknown as ApplicationRepository,
      {} as never,
      {} as never,
      {} as never,
      prismaQueryBuilder as unknown as PrismaQueryBuilder,
      checkPermissions as unknown as CheckPermissions,
      applicationSearchService as unknown as ApplicationSearchService,
      {} as never,
    );

    return {
      service,
      applicationRepository,
      prismaQueryBuilder,
      applicationSearchService,
    };
  };

  it("sans q : passe par findApplications, sans appeler le moteur full-text", async () => {
    const { service, applicationRepository, applicationSearchService } =
      setup();

    await service.search({ pageSize: 15 } as ApplicationSearchDto, requestor);

    expect(applicationSearchService.fullTextSearch).not.toHaveBeenCalled();
    expect(applicationRepository.findApplications).toHaveBeenCalledTimes(1);
    expect(
      applicationRepository.findMatchingApplications,
    ).not.toHaveBeenCalled();
  });

  it("avec q : interroge le moteur, restreint aux ids trouvés et trie par pertinence", async () => {
    const { service, applicationRepository, applicationSearchService } = setup(
      ["app-x", "app-y"],
      [
        { id: "app-y", quality: 40 },
        { id: "app-x", quality: 80 },
      ],
    );

    await service.search(
      { q: "gestion factures" } as ApplicationSearchDto,
      requestor,
    );

    expect(applicationSearchService.fullTextSearch).toHaveBeenCalledWith(
      "gestion factures",
    );
    // Tri par pertinence => une passe filtrée + chargement de la page.
    expect(
      applicationRepository.findMatchingApplications,
    ).toHaveBeenCalledTimes(1);
    expect(applicationRepository.findApplications).not.toHaveBeenCalled();

    const [where] =
      applicationRepository.findMatchingApplications.mock.calls[0];
    expect(where.AND).toContainEqual({ id: { in: ["app-x", "app-y"] } });

    // La page est chargée dans l'ordre de pertinence du moteur (app-x d'abord),
    // pas dans l'ordre de la passe filtrée.
    const [, orderedIds] =
      applicationRepository.findApplicationsPage.mock.calls[0];
    expect(orderedIds).toEqual(["app-x", "app-y"]);
  });

  it("avec q : total et IQ moyen calculés depuis la passe filtrée", async () => {
    const { service } = setup(
      ["app-x", "app-y"],
      [
        { id: "app-x", quality: 80 },
        { id: "app-y", quality: 40 },
      ],
    );

    const result = await service.search(
      { q: "gestion" } as ApplicationSearchDto,
      requestor,
    );

    expect(result.total).toBe(2);
    expect(result.averageIq).toBe(60);
  });

  it("avec qPrefix : utilise le moteur préfixe (prioritaire sur q) et trie par pertinence", async () => {
    const { service, applicationRepository, applicationSearchService } = setup(
      ["app-x"],
      [{ id: "app-x", quality: 50 }],
    );

    await service.search(
      { qPrefix: "tow muel", q: "ignore" } as ApplicationSearchDto,
      requestor,
    );

    expect(applicationSearchService.fullTextSearchPrefix).toHaveBeenCalledWith(
      "tow muel",
    );
    expect(applicationSearchService.fullTextSearch).not.toHaveBeenCalled();
    expect(
      applicationRepository.findMatchingApplications,
    ).toHaveBeenCalledTimes(1);
  });

  it("avec q ET un tri explicite : conserve le filtre full-text mais respecte le tri demandé", async () => {
    const { service, applicationRepository, applicationSearchService } =
      setup();

    await service.search(
      {
        q: "facture",
        sortBy: "quality",
        order: "desc",
      } as ApplicationSearchDto,
      requestor,
    );

    expect(applicationSearchService.fullTextSearch).toHaveBeenCalledWith(
      "facture",
    );
    // Tri explicite (quality) => findApplications classique, pas le tri pertinence.
    expect(applicationRepository.findApplications).toHaveBeenCalledTimes(1);
    expect(
      applicationRepository.findMatchingApplications,
    ).not.toHaveBeenCalled();

    const [, where] = applicationRepository.findApplications.mock.calls[0];
    expect(where.AND).toContainEqual({ id: { in: ["app-x"] } });
  });

  it("avec un tri SQL brut : une seule passe filtrée puis tri des ids", async () => {
    const { service, applicationRepository, prismaQueryBuilder } = setup(
      [],
      [
        { id: "app-a", quality: 20 },
        { id: "app-b", quality: 60 },
      ],
    );
    prismaQueryBuilder.isRawSort.mockReturnValue(true);
    prismaQueryBuilder.sortApplicationIdsRaw.mockResolvedValue([
      "app-b",
      "app-a",
    ]);

    const result = await service.search(
      { sortBy: "moa", order: "asc" } as ApplicationSearchDto,
      requestor,
    );

    expect(
      applicationRepository.findMatchingApplications,
    ).toHaveBeenCalledTimes(1);
    expect(prismaQueryBuilder.sortApplicationIdsRaw).toHaveBeenCalledWith(
      ["app-a", "app-b"],
      "moa",
      "asc",
    );
    const [, orderedIds] =
      applicationRepository.findApplicationsPage.mock.calls[0];
    expect(orderedIds).toEqual(["app-b", "app-a"]);
    expect(result.total).toBe(2);
    expect(result.averageIq).toBe(40);
  });

  it("sans aucune permission : renvoie un résultat vide", async () => {
    const { service, applicationRepository } = setup();
    // Force les deux permissions à false.
    const checkPermissions = (
      service as unknown as { checkPermissions: { can: jest.Mock } }
    ).checkPermissions;
    checkPermissions.can.mockResolvedValue(false);

    const result = await service.search(
      { q: "facture" } as ApplicationSearchDto,
      requestor,
    );

    expect(result).toEqual({
      results: [],
      total: 0,
      averageIq: 0,
      technicalDebtPoints: [],
    });
    expect(applicationRepository.findApplications).not.toHaveBeenCalled();
    expect(
      applicationRepository.findMatchingApplications,
    ).not.toHaveBeenCalled();
  });

  it("avec q : ignore les applications sans IQ (statut exclu) dans le calcul de l'IQ moyen", async () => {
    const { service } = setup(
      ["app-x", "app-y", "app-z"],
      [
        { id: "app-x", quality: 80 },
        { id: "app-y", quality: null },
        { id: "app-z", quality: 40 },
      ],
    );

    const result = await service.search(
      { q: "gestion" } as ApplicationSearchDto,
      requestor,
    );

    expect(result.total).toBe(3);
    expect(result.averageIq).toBe(60);
  });
});

describe("ApplicationService.updateApplicationQuality", () => {
  const mockedCalculateIQ = calculateIQ as jest.Mock;

  beforeEach(() => {
    mockedCalculateIQ.mockClear();
  });

  const setup = (currentStatus: { status: string } | null) => {
    const prisma = {
      application: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            currentStatus ? { id: "app-1", currentStatus } : { id: "app-1" },
          ),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const service = new ApplicationService(
      prisma as unknown as PrismaService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, prisma };
  };

  it("statut decommissioned : réinitialise l'IQ à null sans recalculer", async () => {
    const { service, prisma } = setup({ status: "decommissioned" });

    await service.updateApplicationQuality("app-1");

    expect(mockedCalculateIQ).not.toHaveBeenCalled();
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { quality: null },
    });
  });

  it("statut deleted : réinitialise l'IQ à null sans recalculer", async () => {
    const { service, prisma } = setup({ status: "deleted" });

    await service.updateApplicationQuality("app-1");

    expect(mockedCalculateIQ).not.toHaveBeenCalled();
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { quality: null },
    });
  });

  it("autre statut : recalcule l'IQ normalement", async () => {
    const { service, prisma } = setup({ status: "in_production" });

    await service.updateApplicationQuality("app-1");

    expect(mockedCalculateIQ).toHaveBeenCalledWith("app-1", prisma);
    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { quality: 75 },
    });
  });
});

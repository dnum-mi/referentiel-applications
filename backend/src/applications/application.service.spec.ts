// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
// Sans incidence ici : toutes les dépendances de ApplicationService sont mockées.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import type { Prisma } from "@prisma/client";
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

  const setup = (fullTextIds: string[] = ["app-x"]) => {
    const applicationRepository = {
      findApplications: jest.fn().mockResolvedValue(emptyResult),
      findApplicationsRanked: jest.fn().mockResolvedValue(emptyResult),
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
      {} as never,
      checkPermissions as unknown as CheckPermissions,
      applicationSearchService as unknown as ApplicationSearchService,
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
    expect(applicationRepository.findApplicationsRanked).not.toHaveBeenCalled();
  });

  it("avec q : interroge le moteur, restreint aux ids trouvés et trie par pertinence", async () => {
    const { service, applicationRepository, applicationSearchService } = setup([
      "app-x",
      "app-y",
    ]);

    await service.search(
      { q: "gestion factures" } as ApplicationSearchDto,
      requestor,
    );

    expect(applicationSearchService.fullTextSearch).toHaveBeenCalledWith(
      "gestion factures",
    );
    // Tri par pertinence => findApplicationsRanked (et pas findApplications).
    expect(applicationRepository.findApplicationsRanked).toHaveBeenCalledTimes(
      1,
    );
    expect(applicationRepository.findApplications).not.toHaveBeenCalled();

    const [, where, rankedIds] =
      applicationRepository.findApplicationsRanked.mock.calls[0];
    expect(where.AND).toContainEqual({ id: { in: ["app-x", "app-y"] } });
    expect(rankedIds).toEqual(["app-x", "app-y"]);
  });

  it("avec qPrefix : utilise le moteur préfixe (prioritaire sur q) et trie par pertinence", async () => {
    const { service, applicationRepository, applicationSearchService } = setup([
      "app-x",
    ]);

    await service.search(
      { qPrefix: "tow muel", q: "ignore" } as ApplicationSearchDto,
      requestor,
    );

    expect(applicationSearchService.fullTextSearchPrefix).toHaveBeenCalledWith(
      "tow muel",
    );
    expect(applicationSearchService.fullTextSearch).not.toHaveBeenCalled();
    expect(applicationRepository.findApplicationsRanked).toHaveBeenCalledTimes(
      1,
    );
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
    expect(applicationRepository.findApplicationsRanked).not.toHaveBeenCalled();

    const [, where] = applicationRepository.findApplications.mock.calls[0];
    expect(where.AND).toContainEqual({ id: { in: ["app-x"] } });
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

    expect(result).toEqual({ results: [], total: 0, averageIq: 0 });
    expect(applicationRepository.findApplications).not.toHaveBeenCalled();
    expect(applicationRepository.findApplicationsRanked).not.toHaveBeenCalled();
  });
});

import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { Requestor } from "src/user/entities/user.entity";
import type { ApplicationSearchDto } from "./dto/search-application.dto";
import { ApplicationExportService } from "./export.service";
import type { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import type { ApplicationSearchService } from "./search/application-search.service";
import type { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { Permission } from "@prisma/client";
import type { ApplicationWithAllRelations } from "./types/application.type";

function service({ canRead = true } = {}) {
  const buildSearchWhere = jest.fn(async () => ({
    AND: [{ x: 1 }] as object[],
  }));
  const queryBuilder = {
    buildSearchWhere,
    buildTechnicalDebtInfo: PrismaQueryBuilder.prototype.buildTechnicalDebtInfo,
  } as unknown as PrismaQueryBuilder;
  const fullTextSearch = jest.fn().mockResolvedValue([{ id: "a" }]);
  const fullTextSearchPrefix = jest.fn().mockResolvedValue([{ id: "p" }]);
  const sut = new ApplicationExportService(
    {} as ApplicationRepository,
    {} as ExportApplicationsUseCase,
    queryBuilder,
    {
      can: jest.fn().mockResolvedValue(canRead),
    } as unknown as CheckPermissions,
    {
      fullTextSearch,
      fullTextSearchPrefix,
    } as unknown as ApplicationSearchService,
  );
  return { sut, fullTextSearch, fullTextSearchPrefix };
}

const requestor = { id: "u1" } as Requestor;
const where = (sut: ApplicationExportService, params: object) =>
  sut.buildScopedWhere(params as ApplicationSearchDto, requestor);

describe("ApplicationExportService.buildScopedWhere", () => {
  it("applique le millésime, comme la recherche", async () => {
    const { sut } = service();

    expect(await where(sut, { millesime: 2025 })).toEqual({
      AND: [{ x: 1 }, { technicalDebtInfo: { some: { millesime: 2025 } } }],
    });
  });

  it("restreint aux résultats de la recherche plein texte, préfixe prioritaire", async () => {
    const { sut, fullTextSearch, fullTextSearchPrefix } = service();

    expect(await where(sut, { q: " dossier " })).toEqual({
      AND: [{ x: 1 }, { id: { in: ["a"] } }],
    });
    expect(fullTextSearch).toHaveBeenCalledWith("dossier");
    expect(await where(sut, { q: "dossier", qPrefix: "dos" })).toEqual({
      AND: [{ x: 1 }, { id: { in: ["p"] } }],
    });
    expect(fullTextSearchPrefix).toHaveBeenCalledWith("dos");
  });

  it("ne filtre rien de plus sans millésime ni texte", async () => {
    const { sut, fullTextSearch } = service();

    expect(await where(sut, {})).toEqual({ AND: [{ x: 1 }] });
    expect(fullTextSearch).not.toHaveBeenCalled();
  });

  it("renvoie null si le demandeur ne peut lire aucune application", async () => {
    expect(await where(service({ canRead: false }).sut, {})).toBeNull();
  });
});

describe("ApplicationExportService — lecture des technologies par fiche", () => {
  it("contrôle TechnologyRead sur chaque application sans modifier les données du dépôt", async () => {
    const technology = { product: "Produit privé" };
    const applications = [
      { id: "visible", label: "Visible", technologies: [technology] },
      { id: "hidden", label: "Masquée", technologies: [technology] },
      { id: "empty", label: "Vide", technologies: [] },
    ] as unknown as ApplicationWithAllRelations[];
    const executeWithApps = jest.fn().mockResolvedValue(Buffer.from("xlsx"));
    const can = jest.fn(
      async (permissions: Permission[], _: Requestor, id?: string) =>
        permissions.includes(Permission.TechnologyRead)
          ? id === "visible"
          : true,
    );
    const findAllWithFullRelations = jest.fn().mockResolvedValue(applications);
    const sut = new ApplicationExportService(
      { findAllWithFullRelations } as unknown as ApplicationRepository,
      { executeWithApps } as unknown as ExportApplicationsUseCase,
      {
        buildSearchWhere: jest.fn().mockResolvedValue({ AND: [] }),
        buildOrderBy: jest.fn().mockReturnValue({ label: "desc" }),
      } as unknown as PrismaQueryBuilder,
      { can } as unknown as CheckPermissions,
      {} as ApplicationSearchService,
    );

    await sut.exportSearchResultsToExcel(
      { page: 2, pageSize: 1, sortBy: "label", order: "desc" },
      requestor,
    );

    expect(findAllWithFullRelations).toHaveBeenCalledWith(
      { AND: [] },
      { label: "desc" },
    );
    expect(can).toHaveBeenCalledWith(
      [Permission.TechnologyRead],
      requestor,
      "visible",
    );
    expect(can).toHaveBeenCalledWith(
      [Permission.TechnologyRead],
      requestor,
      "hidden",
    );
    const exported = executeWithApps.mock
      .calls[0][0] as ApplicationWithAllRelations[];
    expect(exported.map((app) => app.technologies)).toEqual([
      [technology],
      [],
      [],
    ]);
    expect(applications[1].technologies).toEqual([technology]);
  });
});

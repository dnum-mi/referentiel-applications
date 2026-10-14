import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { Requestor } from "src/user/entities/user.entity";
import type { ApplicationSearchDto } from "./dto/search-application.dto";
import { ApplicationExportService } from "./export.service";
import type { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import type { ApplicationSearchService } from "./search/application-search.service";
import type { ExportApplicationsUseCase } from "./usecases/application-export.usecase";

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

import { Permission } from "@prisma/client";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { Requestor } from "src/user/entities/user.entity";
import { ApplicationSearchDto } from "./dto/search-application.dto";
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

describe("Même recherche et même périmètre dans les exports HTML et Excel", () => {
  const requestor = {
    email: "scoped@example.test",
    organization: { businessDivisionId: "direction" },
  } as unknown as Requestor;

  it.each([true, false])(
    "conserve filtres, tri et absence de pagination avec AppList=%s",
    async (appList) => {
      const can = jest.fn(
        async (permissions: Permission[]) =>
          permissions.includes(Permission.AppRead) || appList,
      );
      const where = { label: { contains: "recherche" } };
      const orderBy = { label: "desc" };
      const buildSearchWhere = jest.fn(async () => where);
      const buildOrderBy = jest.fn(() => orderBy);
      const findAllWithFullRelations = jest.fn().mockResolvedValue([]);
      const executeWithApps = jest.fn().mockResolvedValue(Buffer.from("xlsx"));
      const executeHtmlWithApps = jest
        .fn()
        .mockResolvedValue(Buffer.from("html"));
      const service = new ApplicationExportService(
        { findAllWithFullRelations } as unknown as ApplicationRepository,
        {
          executeWithApps,
          executeHtmlWithApps,
        } as unknown as ExportApplicationsUseCase,
        { buildSearchWhere, buildOrderBy } as unknown as PrismaQueryBuilder,
        { can } as unknown as CheckPermissions,
        {} as ApplicationSearchService,
      );
      const filters = new ApplicationSearchDto();
      Object.assign(filters, {
        search: "recherche",
        sortBy: "label",
        order: "desc",
        page: 4,
        pageSize: 1,
      });
      await service.exportSearchResultsToExcel(filters, requestor);
      await service.exportSearchResultsToHtml(filters, requestor);
      const scope = appList
        ? undefined
        : { actorEmail: requestor.email, businessDivisionId: "direction" };
      expect(buildSearchWhere).toHaveBeenNthCalledWith(
        1,
        filters,
        requestor,
        scope,
      );
      expect(buildSearchWhere).toHaveBeenNthCalledWith(
        2,
        filters,
        requestor,
        scope,
      );
      expect(buildOrderBy).toHaveBeenCalledWith("label", "desc");
      expect(findAllWithFullRelations).toHaveBeenNthCalledWith(
        1,
        where,
        orderBy,
      );
      expect(findAllWithFullRelations).toHaveBeenNthCalledWith(
        2,
        where,
        orderBy,
      );
      expect(executeWithApps).toHaveBeenCalledWith([]);
      expect(executeHtmlWithApps).toHaveBeenCalledWith([]);
    },
  );

  it("n'interroge aucune application sans AppList ni AppRead", async () => {
    const findAllWithFullRelations = jest.fn();
    const executeHtmlWithApps = jest
      .fn()
      .mockResolvedValue(Buffer.from("html vide"));
    const service = new ApplicationExportService(
      { findAllWithFullRelations } as unknown as ApplicationRepository,
      { executeHtmlWithApps } as unknown as ExportApplicationsUseCase,
      {} as PrismaQueryBuilder,
      {
        can: jest.fn().mockResolvedValue(false),
      } as unknown as CheckPermissions,
      {} as ApplicationSearchService,
    );
    await service.exportSearchResultsToHtml(
      new ApplicationSearchDto(),
      requestor,
    );
    expect(findAllWithFullRelations).not.toHaveBeenCalled();
    expect(executeHtmlWithApps).toHaveBeenCalledWith([]);
  });

  it.each(["Excel", "Html"] as const)(
    "l'export %s combine le périmètre, le millésime et la recherche préfixe sans pagination",
    async (format) => {
      const buildSearchWhere = jest.fn(async () => ({
        AND: [{ label: { contains: "recherche" } }],
      }));
      const orderBy = { label: "desc" };
      const buildOrderBy = jest.fn(() => orderBy);
      const findAllWithFullRelations = jest.fn().mockResolvedValue([]);
      const executeWithApps = jest.fn().mockResolvedValue(Buffer.from("xlsx"));
      const executeHtmlWithApps = jest
        .fn()
        .mockResolvedValue(Buffer.from("html"));
      const fullTextSearch = jest.fn();
      const fullTextSearchPrefix = jest
        .fn()
        .mockResolvedValue([{ id: "matched" }]);
      const exportService = new ApplicationExportService(
        { findAllWithFullRelations } as unknown as ApplicationRepository,
        {
          executeWithApps,
          executeHtmlWithApps,
        } as unknown as ExportApplicationsUseCase,
        {
          buildSearchWhere,
          buildOrderBy,
          buildTechnicalDebtInfo:
            PrismaQueryBuilder.prototype.buildTechnicalDebtInfo,
        } as unknown as PrismaQueryBuilder,
        {
          can: jest.fn(async (permissions: Permission[]) =>
            permissions.includes(Permission.AppRead),
          ),
        } as unknown as CheckPermissions,
        {
          fullTextSearch,
          fullTextSearchPrefix,
        } as unknown as ApplicationSearchService,
      );
      const filters = Object.assign(new ApplicationSearchDto(), {
        search: "recherche",
        millesime: 2025,
        q: " texte complet ",
        qPrefix: " préfixe ",
        sortBy: "label",
        order: "desc",
        page: 4,
        pageSize: 1,
      });

      if (format === "Excel") {
        await exportService.exportSearchResultsToExcel(filters, requestor);
      } else {
        await exportService.exportSearchResultsToHtml(filters, requestor);
      }

      expect(buildSearchWhere).toHaveBeenCalledWith(filters, requestor, {
        actorEmail: requestor.email,
        businessDivisionId: "direction",
      });
      expect(fullTextSearchPrefix).toHaveBeenCalledWith("préfixe");
      expect(fullTextSearch).not.toHaveBeenCalled();
      expect(findAllWithFullRelations).toHaveBeenCalledWith(
        {
          AND: [
            { label: { contains: "recherche" } },
            { technicalDebtInfo: { some: { millesime: 2025 } } },
            { id: { in: ["matched"] } },
          ],
        },
        orderBy,
      );
      expect(buildOrderBy).toHaveBeenCalledWith("label", "desc");
      const exporter =
        format === "Excel" ? executeWithApps : executeHtmlWithApps;
      expect(exporter).toHaveBeenCalledWith([]);
    },
  );
});

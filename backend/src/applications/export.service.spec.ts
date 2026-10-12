import { Permission } from "@prisma/client";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { Requestor } from "src/user/entities/user.entity";
import type { ApplicationRepository } from "./infrastructure/repository/application.repository";
import type { PrismaQueryBuilder } from "./prisma-query-builder.service";
import type { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { ApplicationExportService } from "./export.service";
import { ApplicationSearchDto } from "./dto/search-application.dto";

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
    );
    await service.exportSearchResultsToHtml(
      new ApplicationSearchDto(),
      requestor,
    );
    expect(findAllWithFullRelations).not.toHaveBeenCalled();
    expect(executeHtmlWithApps).toHaveBeenCalledWith([]);
  });
});

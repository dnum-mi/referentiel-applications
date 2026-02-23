import { Injectable } from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
  BusinessDivisionDTO,
  BusinessDivisionFiltersDto,
} from "./dto/business-division.dto";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class BusinessDivisionService extends BaseService<
  BusinessDivisionDTO,
  Prisma.BusinessDivisionDelegate
> {
  constructor(
    private readonly queryBuilder: PrismaQueryBuilder,
    protected readonly prisma: PrismaService,
  ) {
    super(prisma.businessDivision, prisma);
  }

  public findById(id: string) {
    return this.findOne(id);
  }

  public async search(searchParams: BusinessDivisionFiltersDto) {
    const where = this.queryBuilder.buildSearchWhere(searchParams);
    const orderBy = this.queryBuilder.buildOrderBy(searchParams);
    return this.findAllPaginated({
      where,
      orderBy,
      page: searchParams.page,
      pageSize: searchParams.pageSize,
    });
  }
}

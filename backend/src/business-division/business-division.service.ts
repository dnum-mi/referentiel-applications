import { Injectable, NotFoundException } from "@nestjs/common";
import { BusinessDivisionRepository } from "./business-division.repository";
import { BusinessDivisionFiltersDto } from "./dto/business-division.dto";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

@Injectable()
export class BusinessDivisionService {
  constructor(
    private readonly repository: BusinessDivisionRepository,
    private readonly queryBuilder: PrismaQueryBuilder,
  ) {}

  public async findById(id: string) {
    const businessDivision = await this.repository.findFirstById(id);
    if (!businessDivision) {
      throw new NotFoundException(`Business division with ${id} not found`);
    }
    return businessDivision;
  }

  public async search(searchParams: BusinessDivisionFiltersDto) {
    const where = this.queryBuilder.buildSearchWhere(searchParams);
    const orderBy = this.queryBuilder.buildOrderBy(searchParams);
    return this.repository.findAll({
      where,
      orderBy,
      page: searchParams.page,
      pageSize: searchParams.pageSize,
    });
  }
}

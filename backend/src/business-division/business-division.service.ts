import { ConflictException, Injectable } from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
  BusinessDivisionDTO,
  BusinessDivisionFiltersDto,
  CreateBusinessDivisionDto,
  UpdateBusinessDivisionDto,
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

  public async createDivision(dto: CreateBusinessDivisionDto) {
    await this.assertLabelAvailable(dto.label);
    return this.create(dto);
  }

  public async updateDivision(id: string, dto: UpdateBusinessDivisionDto) {
    if (dto.label != null) {
      await this.assertLabelAvailable(dto.label, id);
    }
    return this.update(id, dto);
  }

  private async assertLabelAvailable(label: string, excludedId?: string) {
    const existing = await this.prisma.businessDivision.findUnique({
      where: { label },
    });
    if (existing && existing.id !== excludedId) {
      throw new ConflictException(
        `Une direction métier existe déjà avec le nom « ${label} »`,
      );
    }
  }

  public async search(searchParams: BusinessDivisionFiltersDto) {
    const where = this.queryBuilder.buildSearchWhere(searchParams);
    const orderBy = this.queryBuilder.buildOrderBy(searchParams);
    return this.findAll({
      where,
      orderBy,
      page: searchParams.page,
      pageSize: searchParams.pageSize,
      include: {
        _count: { select: { organizations: true, applications: true } },
      },
    });
  }
}

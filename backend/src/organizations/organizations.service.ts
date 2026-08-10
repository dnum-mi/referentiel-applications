import { Injectable, NotFoundException } from "@nestjs/common";
import { Organization, Prisma } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { OrganizationFilterDto } from "./dto/filters.dto";
import {
  CreateOrganizationDto,
  OrganizationDto,
} from "./dto/organizations.dto";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

@Injectable()
export class OrganizationsService extends BaseService<
  Organization,
  Prisma.OrganizationDelegate
> {
  constructor(
    prisma: PrismaService,
    private readonly queryBuilder: PrismaQueryBuilder,
  ) {
    super(prisma.organization, prisma);
  }

  async create(data: CreateOrganizationDto): Promise<Organization> {
    await this.assertBusinessDivisionExists(data.businessDivisionId);
    const newOrg = await super.create(data);
    return newOrg;
  }

  async find(
    filters: OrganizationFilterDto,
  ): Promise<PaginatedResponseDto<OrganizationDto>> {
    const { page, pageSize } = filters;
    const where = this.queryBuilder.buildSearchWhere(filters);
    return this.findAll({
      where,
      page,
      pageSize,
      include: {
        maiaReferences: true,
        businessDivision: true,
      },
    });
  }

  async findOneWithReferences(id: string) {
    return this.findOne(id, {
      maiaReferences: true,
      businessDivision: true,
    });
  }

  async update(
    id: string,
    data: Partial<CreateOrganizationDto>,
  ): Promise<Organization> {
    await this.assertBusinessDivisionExists(data.businessDivisionId);
    const patchedOrg = await super.update(id, data);
    return patchedOrg;
  }

  private async assertBusinessDivisionExists(
    businessDivisionId?: string | null,
  ) {
    if (!businessDivisionId) {
      return;
    }
    const division = await this.prisma.businessDivision.findUnique({
      where: { id: businessDivisionId },
    });
    if (!division) {
      throw new NotFoundException("Direction métier non trouvée");
    }
  }

  async deleteSafe(id: string, force = false): Promise<void> {
    if (!force) {
      // Vérifier si l'organisation a des enfants
      const children = await this.prisma.organization.findMany({
        where: { parentId: id },
      });
      if (children.length > 0) {
        throw new Error(
          "Cannot delete organization with children. Use force delete.",
        );
      }
    }
    await this.prisma.organization.delete({ where: { id } });
  }
}

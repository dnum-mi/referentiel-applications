import type { MditCampaign, Prisma } from "@prisma/client";
import { ConflictException, Injectable } from "@nestjs/common";
import { BaseService } from "../common/base.service";
import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponseDto } from "src/common/dto";
import {
  CreateMditCampaignDto,
  MditCampaignFiltersDto,
} from "./dto/mdit-campaign.dto";

@Injectable()
export class MditCampaignService extends BaseService<MditCampaign> {
  constructor(prisma: PrismaService) {
    super(prisma.mditCampaign, prisma);
  }

  async createCampaign(dto: CreateMditCampaignDto): Promise<MditCampaign> {
    const existing = await this.prisma.mditCampaign.findUnique({
      where: { year: dto.year },
    });
    if (existing) {
      throw new ConflictException(
        `Une campagne existe déjà pour le millésime ${dto.year}`,
      );
    }
    return this.create(dto);
  }

  async updateCampaign(
    id: string,
    dto: Partial<CreateMditCampaignDto>,
  ): Promise<MditCampaign> {
    if (dto.year != null) {
      const existing = await this.prisma.mditCampaign.findUnique({
        where: { year: dto.year },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Une campagne existe déjà pour le millésime ${dto.year}`,
        );
      }
    }
    return this.update(id, dto);
  }

  async findAllCampaigns(
    filters?: MditCampaignFiltersDto,
  ): Promise<PaginatedResponseDto<MditCampaign>> {
    const where: Prisma.MditCampaignWhereInput = {};
    if (filters?.onlyActive) {
      where.isActive = true;
    }

    return this.findAll({
      where,
      orderBy: [{ year: "desc" }],
      page: filters?.page,
      pageSize: filters?.pageSize,
    });
  }
}

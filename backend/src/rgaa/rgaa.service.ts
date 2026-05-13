import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateRgaaComplianceDto } from "./dto/rgaa-compliance.dto";
import { RgaaCompliance } from "./entities/rgaa-compliance.entity";
import { ServiceOptions } from "src/common/utils/types";
import { ApplicationService } from "src/applications/application.service";

@Injectable()
export class RgaaService extends BaseService<RgaaCompliance> {
  constructor(
    readonly prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.rgaaCompliance, prisma, metadataService, applicationService);
  }

  async findAllByApplicationId(
    applicationId: string,
  ): Promise<RgaaCompliance[]> {
    return this.prisma.rgaaCompliance.findMany({
      where: { applicationId },
      orderBy: { service_url: "asc" },
    }) as unknown as RgaaCompliance[];
  }

  async createRgaa(
    applicationId: string,
    dto: CreateRgaaComplianceDto,
    options?: ServiceOptions<RgaaCompliance>,
  ): Promise<RgaaCompliance> {
    const applicationExists = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!applicationExists) {
      throw new NotFoundException(
        "Application introuvable pour cet identifiant",
      );
    }

    if (dto.service_url) {
      const existing = await this.prisma.rgaaCompliance.findUnique({
        where: {
          applicationId_service_url: {
            applicationId,
            service_url: dto.service_url,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          "Une conformité RGAA existe déjà pour cette URL de service sur cette application",
        );
      }
    }

    return super.create(
      { ...dto, applicationId },
      options,
    ) as unknown as RgaaCompliance;
  }

  async updateRgaa(
    id: string,
    applicationId: string,
    dto: Partial<CreateRgaaComplianceDto>,
    options?: ServiceOptions<RgaaCompliance>,
  ): Promise<RgaaCompliance> {
    const existing = await this.prisma.rgaaCompliance.findUnique({
      where: { id },
    });
    if (!existing || existing.applicationId !== applicationId) {
      throw new NotFoundException("Conformité RGAA introuvable");
    }

    if (dto.service_url && dto.service_url !== existing.service_url) {
      const conflict = await this.prisma.rgaaCompliance.findUnique({
        where: {
          applicationId_service_url: {
            applicationId,
            service_url: dto.service_url,
          },
        },
      });
      if (conflict) {
        throw new ConflictException(
          "Une conformité RGAA existe déjà pour cette URL de service sur cette application",
        );
      }
    }

    return super.update(id, dto, options) as unknown as RgaaCompliance;
  }

  async deleteRgaa(
    id: string,
    applicationId: string,
    options?: ServiceOptions<RgaaCompliance>,
  ): Promise<void> {
    const existing = await this.prisma.rgaaCompliance.findUnique({
      where: { id },
    });
    if (!existing || existing.applicationId !== applicationId) {
      throw new NotFoundException("Conformité RGAA introuvable");
    }
    await super.delete(id, options);
  }
}

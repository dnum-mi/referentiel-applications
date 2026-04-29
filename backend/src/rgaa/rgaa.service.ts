import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { RgaaCompliance } from "./entities/rgaa-compliance.entity";
import { CreateRgaaComplianceDto } from "./dto/rgaa-compliance.dto";

@Injectable()
export class RgaaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByApplicationId(
    applicationId: string,
  ): Promise<RgaaCompliance[]> {
    return this.prisma.rgaaCompliance.findMany({
      where: { applicationId },
      orderBy: { service_url: "asc" },
    }) as unknown as RgaaCompliance[];
  }

  async create(
    applicationId: string,
    dto: CreateRgaaComplianceDto,
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

    return this.prisma.rgaaCompliance.create({
      data: { ...dto, applicationId },
    }) as unknown as RgaaCompliance;
  }

  async update(
    id: string,
    applicationId: string,
    dto: Partial<CreateRgaaComplianceDto>,
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

    return this.prisma.rgaaCompliance.update({
      where: { id },
      data: dto,
    }) as unknown as RgaaCompliance;
  }

  async delete(id: string, applicationId: string): Promise<void> {
    const existing = await this.prisma.rgaaCompliance.findUnique({
      where: { id },
    });
    if (!existing || existing.applicationId !== applicationId) {
      throw new NotFoundException("Conformité RGAA introuvable");
    }
    await this.prisma.rgaaCompliance.delete({ where: { id } });
  }
}

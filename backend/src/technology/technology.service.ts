import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTechnologyDto } from "./dto/technology.dto";
import { TechnologyStack } from "./entities/technology.entity";
import { ServiceOptions } from "src/common/utils/types";
import { ApplicationService } from "src/applications/application.service";

@Injectable()
export class TechnologyService extends BaseService<TechnologyStack> {
  constructor(
    readonly prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.technologyStack, prisma, metadataService, applicationService);
  }

  async findAllByApplicationId(
    applicationId: string,
  ): Promise<TechnologyStack[]> {
    return this.prisma.technologyStack.findMany({
      where: { applicationId },
      orderBy: { technology: "asc" },
    }) as unknown as Promise<TechnologyStack[]>;
  }

  async createTechnology(
    applicationId: string,
    dto: CreateTechnologyDto,
    options?: ServiceOptions<TechnologyStack>,
  ): Promise<TechnologyStack> {
    const applicationExists = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!applicationExists) {
      throw new NotFoundException(
        "Application introuvable pour cet identifiant",
      );
    }

    const existing = await this.prisma.technologyStack.findUnique({
      where: {
        applicationId_technology: {
          applicationId,
          technology: dto.technology,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        "Cette technologie est déjà renseignée pour cette application",
      );
    }

    return super.create({ ...dto, applicationId }, options);
  }

  async updateTechnology(
    id: string,
    applicationId: string,
    dto: Partial<CreateTechnologyDto>,
    options?: ServiceOptions<TechnologyStack>,
  ): Promise<TechnologyStack> {
    const existing = await this.prisma.technologyStack.findUnique({
      where: { id },
    });
    if (existing?.applicationId !== applicationId) {
      throw new NotFoundException("Technologie introuvable");
    }

    if (dto.technology && dto.technology !== existing.technology) {
      const conflict = await this.prisma.technologyStack.findUnique({
        where: {
          applicationId_technology: {
            applicationId,
            technology: dto.technology,
          },
        },
      });
      if (conflict) {
        throw new ConflictException(
          "Cette technologie est déjà renseignée pour cette application",
        );
      }
    }

    return super.update(id, dto, options);
  }

  async deleteTechnology(
    id: string,
    applicationId: string,
    options?: ServiceOptions<TechnologyStack>,
  ): Promise<void> {
    const existing = await this.prisma.technologyStack.findUnique({
      where: { id },
    });
    if (existing?.applicationId !== applicationId) {
      throw new NotFoundException("Technologie introuvable");
    }
    await super.delete(id, options);
  }
}

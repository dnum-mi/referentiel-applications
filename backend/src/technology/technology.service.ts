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
import { fetchTechnologyEol } from "./utils/endoflife.utils";

@Injectable()
export class TechnologyService extends BaseService<TechnologyStack> {
  constructor(
    readonly prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.technologyStack, prisma, metadataService, applicationService);
  }

  // Interroge endoflife.date pour dater la fin de vie. Désactivé en test et via
  // ENDOFLIFE_ENABLED=false pour éviter tout appel réseau non déterministe.
  private async resolveEol(
    technology: string,
    version?: string | null,
  ): Promise<{ eolDate?: Date | null; eolCheckedAt?: Date | null }> {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.ENDOFLIFE_ENABLED === "false"
    ) {
      return {};
    }
    return fetchTechnologyEol(technology, version);
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

    const eol = await this.resolveEol(dto.technology, dto.version);
    return super.create({ ...dto, ...eol, applicationId }, options);
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

    // Recalcule la fin de vie si la technologie ou la version change.
    const technologyChanged =
      dto.technology !== undefined || dto.version !== undefined;
    const eol = technologyChanged
      ? await this.resolveEol(
          dto.technology ?? existing.technology,
          dto.version ?? existing.version,
        )
      : {};

    return super.update(id, { ...dto, ...eol }, options);
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

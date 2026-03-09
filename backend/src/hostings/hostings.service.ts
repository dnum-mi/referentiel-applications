import { Injectable } from "@nestjs/common";
import { ApplicationService } from "src/applications/application.service";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { CreateHostingDto, UpdateHostingDto } from "./dto/hosting.dto";
import { Hosting } from "./entities/hosting.entity";

@Injectable()
export class HostingsService extends BaseService<Hosting> {
  constructor(
    prisma: PrismaService,
    applicationService: ApplicationService,
    metadataService: MetadatasService,
  ) {
    super(prisma.hosting, prisma, metadataService, applicationService);
  }

  async count(): Promise<number> {
    return this.countAll();
  }

  async createHosting(
    dto: CreateHostingDto,
    requestorId: string,
  ): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = dto;

    const data = {
      ...rest,
      application: { connect: { id: applicationId } },
      ...(hostingOptionId && {
        hostingOption: { connect: { id: hostingOptionId } },
      }),
    };

    return super.create(data, {
      applicationId,
      triggerQualityUpdate: true,
      include: { hostingOption: true },
      metadata: {
        userId: requestorId,
        gender: "de l'hébergement",
        getColumn: (entity) => entity.label,
        entity: "hostingId",
      },
    });
  }

  async findOneHosting(id: string): Promise<Hosting> {
    return this.findOne(id, { hostingOption: true });
  }

  async findDistinctSites(): Promise<string[]> {
    const hostingOptionSites = await this.prisma.hostingOption.findMany({
      select: { site: true },
      distinct: ["site"],
      orderBy: { site: "asc" },
    });

    return hostingOptionSites.map((r) => r.site);
  }

  async updateHosting(
    id: string,
    dto: UpdateHostingDto,
    requestorId: string,
  ): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = dto;

    const data = {
      ...rest,
      ...(applicationId && {
        application: { connect: { id: applicationId } },
      }),
      ...(hostingOptionId && {
        hostingOption: { connect: { id: hostingOptionId } },
      }),
    };

    return super.update(id, data, {
      applicationId: dto.applicationId,
      triggerQualityUpdate: true,
      include: { hostingOption: true },
      metadata: {
        userId: requestorId,
        gender: "de l'hébergement",
        getColumn: (entity) => entity.label,
        entity: "hostingId",
        fields: {
          label: "libellé",
          "hostingOption.site": "site",
          "hostingOption.platform": "plateforme",
          "hostingOption.provider": "fournisseur",
          "hostingOption.building": "bâtiment",
          "hostingOption.room": "pièce",
        },
      },
    });
  }

  async remove(id: string, requestorId?: string): Promise<void> {
    await super.delete(id, {
      triggerQualityUpdate: true,
      metadata: {
        userId: requestorId,
        gender: "de l'hébergement",
        getColumn: (entity) => entity.label,
        entity: "hostingId",
      },
    });
  }

  async findByApplicationId(applicationId: string): Promise<Hosting[]> {
    return this.prisma.hosting.findMany({
      where: { applicationId },
      include: { hostingOption: true },
    });
  }
}

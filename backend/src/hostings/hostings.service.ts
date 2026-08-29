import { Injectable, NotFoundException } from "@nestjs/common";
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
      include: { hostingOption: true },
      metadata: {
        userId: requestorId,
        gender: "de l'hébergement",
        getColumn: (entity) => entity.label,
        entity: "hostingId",
      },
    });
  }

  async findOneHosting(id: string, applicationId?: string): Promise<Hosting> {
    const hosting = await this.findOne(id, { hostingOption: true });
    // Scoping (#2367) : sur une route `/applications/:applicationId/hostings`, l'hébergement doit
    // appartenir à cette application.
    if (applicationId && hosting.applicationId !== applicationId) {
      throw new NotFoundException("Hébergement introuvable");
    }
    return hosting;
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
    applicationId: string,
    dto: UpdateHostingDto,
    requestorId: string,
  ): Promise<Hosting> {
    // Scoping (#2367) : l'hébergement doit déjà appartenir à l'application de la route. On ne
    // reparente jamais un hébergement (le `connect` d'application inconditionnel du contrôleur
    // permettait de rattacher l'hébergement d'une autre application à celle-ci).
    await this.findOneHosting(id, applicationId);

    // `applicationId` est écarté du body : l'hébergement ne change jamais d'application ici (le
    // reparentage était le vecteur de fuite #2367), et le passer en scalaire à Prisma lèverait de
    // toute façon (`application` est une relation, pas un champ scalaire en update).
    const {
      hostingOptionId,
      applicationId: _ignoredApplicationId,
      ...rest
    } = dto;

    const data = {
      ...rest,
      ...(hostingOptionId && {
        hostingOption: { connect: { id: hostingOptionId } },
      }),
    };

    return super.update(id, data, {
      applicationId,
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

  async remove(
    id: string,
    applicationId: string,
    requestorId?: string,
  ): Promise<void> {
    // Scoping (#2367).
    await this.findOneHosting(id, applicationId);
    await super.delete(id, {
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

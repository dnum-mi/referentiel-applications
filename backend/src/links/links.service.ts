import type { Prisma } from "@prisma/client";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/applications/application.service";
import { BaseService } from "../common/base.service";
import {
  CreateLinkDto,
  LinkDto,
  LinkFiltersDto,
  UpdateLinkDto,
} from "./dto/links.dto";
import { Link } from "./entities/link.entity";

@Injectable()
export class LinksService extends BaseService<Link> {
  constructor(
    prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(
      prisma.externalRessource,
      prisma,
      metadataService,
      applicationService,
    );
  }

  async find(
    filters: LinkFiltersDto & { applicationId: string },
  ): Promise<PaginatedResponseDto<LinkDto>> {
    const where: Prisma.ExternalRessourceWhereInput = {
      applicationId: filters.applicationId,
    };

    return this.findAll({
      where,
      page: filters.page,
      pageSize: filters.pageSize,
      orderBy: filters.sortBy
        ? { [filters.sortBy]: filters.order || "asc" }
        : { link: "asc" },
    });
  }

  async createLink(
    applicationId: string,
    createLinkDto: CreateLinkDto,
    requestorId: string,
  ) {
    return this.create(
      {
        ...createLinkDto,
        application: {
          connect: { id: applicationId },
        },
      },
      {
        applicationId,
        metadata: {
          userId: requestorId,
          gender: "du lien",
          getColumn: (entity) => entity.link,
          entity: "externalRessourceId",
        },
      },
    );
  }

  // Scoping (#2367) : le lien doit appartenir à l'application de la route, sinon un LinkWrite
  // sur A donnait accès en écriture au lien (et à sa suppression) de n'importe quelle autre
  // application dont on connaît l'id.
  private async assertBelongsToApplication(id: string, applicationId: string) {
    const link = await this.findOne(id);
    if (link.applicationId !== applicationId) {
      throw new NotFoundException("Lien introuvable");
    }
  }

  async updateLink(
    id: string,
    applicationId: string,
    updateLinkDto: UpdateLinkDto,
    requestorId: string,
  ) {
    await this.assertBelongsToApplication(id, applicationId);
    return this.update(id, updateLinkDto, {
      applicationId,
      metadata: {
        userId: requestorId,
        gender: "du lien",
        getColumn: (entity) => entity.link,
        entity: "externalRessourceId",
        fields: {
          link: "lien",
          type: "type",
          description: "description",
        },
      },
    });
  }

  async deleteLink(id: string, applicationId: string, requestorId: string) {
    await this.assertBelongsToApplication(id, applicationId);
    return this.delete(id, {
      applicationId,
      metadata: {
        userId: requestorId,
        gender: "du lien",
        getColumn: (entity) => entity.link,
        entity: "externalRessourceId",
      },
    });
  }
}

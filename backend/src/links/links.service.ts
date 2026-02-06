import type { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ApplicationService } from "src/applications/application.service";
import { BaseService } from "../common/base.service";
import { LinkDto, LinkFiltersDto } from "./dto/links.dto";
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

    return this.prisma.externalRessource.paginate({
      where,
      page: filters.page,
      pageSize: filters.pageSize,
      orderBy: filters.sortBy
        ? { [filters.sortBy]: filters.order || "asc" }
        : { link: "asc" },
    });
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { BaseService } from "../common/base.service";
import { Link } from "./entities/link.entity";
import { MetadataService } from "src/metadata/metadata.service";
import { ApplicationService } from "src/product/application.service";
import { LinkFiltersDto, LinksPaginatedResponseDto } from "./dto/links.dto";
import { paginate } from "src/common/utils/pagination.utils";
import type { Prisma } from "@prisma/client";

@Injectable()
export class LinksService extends BaseService<Link> {
  constructor(
    prisma: PrismaService,
    metadataService: MetadataService,
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
  ): Promise<LinksPaginatedResponseDto> {
    const where: Prisma.ExternalRessourceWhereInput = {
      applicationId: filters.applicationId,
    };

    return new LinksPaginatedResponseDto(await this.prisma.externalRessource.findMany({
      where,
      ...paginate(filters.page, filters.pageSize),
      orderBy: filters.sortBy
        ? { [filters.sortBy]: filters.order || "asc" }
        : { link: "asc" },
    }), await this.prisma.externalRessource.count({ where }));
  }
}

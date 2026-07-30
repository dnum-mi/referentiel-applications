import { BadRequestException, Injectable } from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { PaginatedResponseDto } from "src/common/dto";
import { TagFiltersDto } from "./dto/tag.dto";
import { Tag } from "./entities/tag.entity";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

@Injectable()
export class TagsService extends BaseService<Tag> {
  constructor(
    prisma: PrismaService,
    private readonly queryBuilder: PrismaQueryBuilder,
  ) {
    super(prisma.tag, prisma);
  }

  findAllTags(filters: TagFiltersDto): Promise<PaginatedResponseDto<Tag>> {
    return this.findAll({
      where: this.queryBuilder.buildSearchWhere(filters),
      orderBy: this.queryBuilder.buildOrderBy(filters),
      page: filters.page,
      pageSize: filters.pageSize,
      include: {
        _count: { select: { applications: true } },
      },
    });
  }

  async findByNames(tagNames: string[]): Promise<{ name: string }[]> {
    const normalizedNames = tagNames?.map((name) => name.trim().toLowerCase());
    const existingTags = await this.prisma.tag.findMany({
      where: normalizedNames ? { name: { in: normalizedNames } } : undefined,
    });

    if (existingTags.length !== normalizedNames.length) {
      const existingNames = new Set(existingTags.map((tag) => tag.name));
      const missingNames = normalizedNames.filter(
        (name) => !existingNames.has(name),
      );

      throw new BadRequestException({
        message: "Certains tags n’existent pas.",
        tags_inexistant: missingNames,
      });
    }

    return existingTags.map((tag) => ({ name: tag.name }));
  }
}

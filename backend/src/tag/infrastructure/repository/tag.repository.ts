import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTagDto, TagFiltersDto, UpdateTagDto } from "src/tag/dto/tag.dto";
import { Tag } from "src/tag/entities/tag.entity";
import { ITagRepository } from "./tag.repository.interface";

@Injectable()
export class TagRepository implements ITagRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(tag: CreateTagDto) {
    return await this.prisma.tag.create({
      data: tag,
    });
  }

  public async findAll(
    filters: TagFiltersDto,
  ): Promise<PaginatedResponseDto<Tag>> {
    const where: Prisma.TagWhereInput = filters.name
      ? { name: { startsWith: filters.name, mode: "insensitive" } }
      : {};

    let orderBy: Prisma.TagOrderByWithRelationInput = {
      applications: { _count: "desc" },
    };

    if (filters.sortBy) {
      const sortField = filters.sortBy === "createdAt" ? "createdAt" : "name";
      const sortOrder: Prisma.SortOrder =
        filters.order === "desc" ? "desc" : "asc";

      orderBy = {
        [sortField]: sortOrder,
      };
    }

    return this.prisma.tag.paginate({
      where,
      orderBy,
      page: filters.page,
      pageSize: filters.pageSize,
      include: {
        _count: { select: { applications: true } },
      },
    });
  }

  public async findById(id: string) {
    return await this.prisma.tag.findUnique({
      where: { id },
    });
  }

  public async findByNames(tagNames: string[]) {
    return tagNames
      ? await this.prisma.tag.findMany({ where: { name: { in: tagNames } } })
      : [];
  }

  public async update(id: string, tag: UpdateTagDto) {
    return await this.prisma.tag.update({
      where: { id },
      data: tag,
    });
  }

  public async delete(id: string) {
    return await this.prisma.tag.delete({ where: { id } });
  }
}

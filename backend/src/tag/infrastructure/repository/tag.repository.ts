import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTagDto, TagDto, TagFiltersDto, UpdateTagDto } from "src/tag/dto/tag.dto";
import { ITagRepository } from "./tag.repository.interface";

@Injectable()
export class TagRepository implements ITagRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  public async create(tag: CreateTagDto) {
    return await this.prisma.tag.create({
      data: tag,
    });
  }

  async findAll(filters: TagFiltersDto): Promise<TagDto[]> {
    const where: Prisma.TagWhereInput = {};

    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: "insensitive",
      };
    }

    return await this.prisma.tag.findMany({
      where,
      take: 10,
      include: {
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        applications: {
          _count: "desc",
        },
      },
    });
  }

  public async findById(id: string) {
    return await this.prisma.tag.findUnique({
      where: { id },
    });
  }

  public async findByNames(tagNames: string[]) {
    return tagNames ? await this.prisma.tag.findMany({ where: { name: { in: tagNames } } }) : [];
  }

  public async update(
    id: string,
    tag: UpdateTagDto,
  ) {
    return await this.prisma.tag.update({
      where: { id },
      data: tag,
    });
  }

  public async delete(id: string) {
    return await this.prisma.tag.delete({ where: { id } });
  }
}

import { Injectable } from '@nestjs/common';
import { FctUrbanzone, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UrbanzonesService {
  constructor(private prisma: PrismaService) {}

  async getAll(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.FctUrbanzoneWhereUniqueInput;
    where?: Prisma.FctUrbanzoneWhereInput;
    orderBy?: Prisma.FctUrbanzoneOrderByWithRelationAndSearchRelevanceInput;
    include?: Prisma.FctUrbanzoneInclude;
  }): Promise<FctUrbanzone[]> {
    return this.prisma.fctUrbanzone.findMany({
      skip: params?.skip,
      take: params?.take,
      cursor: params?.cursor,
      where: params?.where,
      orderBy: params?.orderBy,
      include: params?.include,
    });
  }

  async getOneBy(
    orgWhereUniqueInput: Prisma.FctUrbanzoneWhereUniqueInput,
  ): Promise<FctUrbanzone | null> {
    return this.prisma.fctUrbanzone.findUnique({
      where: orgWhereUniqueInput,
    });
  }

  async create(data: Prisma.FctUrbanzoneCreateInput): Promise<FctUrbanzone> {
    return this.prisma.fctUrbanzone.create({ data });
  }

  async updateOneBy(
    where: Prisma.FctUrbanzoneWhereUniqueInput,
    data: Prisma.FctUrbanzoneUpdateInput,
  ): Promise<FctUrbanzone> {
    return this.prisma.fctUrbanzone.update({
      data: {
        ...data,
        //TODO understand what is createdby/updatedby is
        ...{ updatedby: 'Initialisation' },
      },
      where,
    });
  }
}

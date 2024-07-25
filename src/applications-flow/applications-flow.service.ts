import { Injectable } from '@nestjs/common';
import { AppFlow, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApplicationsFlowService {
  constructor(private prisma: PrismaService) {}

  async getAll(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AppFlowWhereUniqueInput;
    where?: Prisma.AppFlowWhereInput;
    orderBy?: Prisma.AppFlowOrderByWithRelationAndSearchRelevanceInput;
    include?: Prisma.AppFlowInclude;
  }): Promise<AppFlow[]> {
    return this.prisma.appFlow.findMany({
      skip: params?.skip,
      take: params?.take,
      cursor: params?.cursor,
      where: params?.where,
      orderBy: params?.orderBy,
      include: params?.include,
    });
  }

  async getOneBy(
    orgWhereUniqueInput: Prisma.AppFlowWhereUniqueInput,
  ): Promise<AppFlow | null> {
    return this.prisma.appFlow.findUnique({
      where: orgWhereUniqueInput,
    });
  }

  async create(data: Prisma.AppFlowCreateInput): Promise<AppFlow> {
    return this.prisma.appFlow.create({ data });
  }

  async updateOneBy(
    where: Prisma.AppFlowWhereUniqueInput,
    data: Prisma.AppFlowUpdateInput,
  ): Promise<AppFlow> {
    return this.prisma.appFlow.update({
      data,
      where,
    });
  }
}

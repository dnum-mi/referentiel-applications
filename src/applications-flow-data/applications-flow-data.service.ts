import { Injectable } from '@nestjs/common';
import { AppFlowdata, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApplicationsFlowDataService {
  constructor(private prisma: PrismaService) {}

  async getAll(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AppFlowdataWhereUniqueInput;
    where?: Prisma.AppFlowdataWhereInput;
    orderBy?: Prisma.AppFlowdataOrderByWithRelationAndSearchRelevanceInput;
    include?: Prisma.AppFlowdataInclude;
  }): Promise<AppFlowdata[]> {
    return this.prisma.appFlowdata.findMany({
      skip: params?.skip,
      take: params?.take,
      cursor: params?.cursor,
      where: params?.where,
      orderBy: params?.orderBy,
      include: params?.include,
    });
  }

  async getOneBy(
    orgWhereUniqueInput: Prisma.AppFlowdataWhereUniqueInput,
  ): Promise<AppFlowdata | null> {
    return this.prisma.appFlowdata.findUnique({
      where: orgWhereUniqueInput,
    });
  }

  async create(data: Prisma.AppFlowdataCreateInput): Promise<AppFlowdata> {
    return this.prisma.appFlowdata.create({ data });
  }

  async updateOneBy(
    where: Prisma.AppFlowdataWhereUniqueInput,
    data: Prisma.AppFlowdataUpdateInput,
  ): Promise<AppFlowdata> {
    return this.prisma.appFlowdata.update({
      data,
      where,
    });
  }
}

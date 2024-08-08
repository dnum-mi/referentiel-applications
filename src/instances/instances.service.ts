import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppInstance, Prisma } from '@prisma/client';
import { Instance } from './entities/instance.entity';
import { CreateInstanceDto } from './dto/create-instance.dto';

@Injectable()
export class InstancesService {
  constructor(private prisma: PrismaService) {}

  async getAll(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.AppInstanceWhereUniqueInput;
    where?: Prisma.AppInstanceWhereInput;
    // orderBy?: Prisma.AppInstanceOrderByWithRelationAndSearchRelevanceInput;
    include?: Prisma.AppInstanceInclude;
  }): Promise<AppInstance[]> {
    return this.prisma.appInstance.findMany({
      skip: params?.skip,
      take: params?.take,
      cursor: params?.cursor,
      where: params?.where,
      // orderBy: params?.orderBy,
      include: params?.include,
    });
  }

  async getOneBy(
    orgWhereUniqueInput: Prisma.AppInstanceWhereUniqueInput,
  ): Promise<AppInstance | null> {
    return this.prisma.appInstance.findUnique({
      where: orgWhereUniqueInput,
    });
  }

  async create(
    username: string,
    applicationid: string,
    organisationid: string,
    inputData: CreateInstanceDto,
  ): Promise<Instance> {
    let env = await this.prisma.envEnvironment.findFirst({
      where: {
        OR: [
          {
            environmentid: inputData.environment.environmentid,
          },
          {
            label: {
              contains: inputData.environment.label,
              mode: 'insensitive',
            },
          },
        ],
      },
    });

    if (!env) {
      env = await this.prisma.envEnvironment.create({
        data: {
          createdby: username,
          updatedby: username,
          label: inputData.environment.label,
          organisation: organisationid,
        },
      });
    }

    const instance = await this.prisma.appInstance.create({
      include: {
        appInstancerole: true,
      },
      data: {
        createdby: username,
        updatedby: username,
        environmentid: env.environmentid,
        tenant: inputData.tenant,
        deploymentdate: inputData.deploymentdate,
        applicationid: applicationid,
      },
    });

    //TODO:: to be investigated , Prisma does not allow this code to run when Create , probably going to cause N+1 Problem
    await this.prisma.appInstance.update({
      where: {
        id: instance.id,
      },
      data: {
        appInstancerole: inputData.role
          ? {
              connect: {
                instancerole: inputData.role,
              },
            }
          : undefined,
        appInstancestatus: inputData.statut
          ? {
              connect: {
                instancestatus: inputData.statut,
              },
            }
          : undefined,
      },
    });

    return instance;
  }
}

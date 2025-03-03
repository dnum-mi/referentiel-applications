import { applicationMap } from '../../application/map/application.map';
import { IApplicationRepository } from './application.repository.interface';

import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from '../../application/dto/create-application.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApplicationRepository implements IApplicationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(
    application: CreateApplicationDto,
    applicationMetadataId: string,
    ownerId: string,
  ) {
    const mappedData = applicationMap(
      application,
      applicationMetadataId,
      ownerId,
    );
    return await this.prisma.application.create(mappedData);
  }

  public async findAll() {
    return await this.prisma.application.findMany({
      include: {
        actors: true,
        relationsAsSource: {
          include: {
            targetApplication: true,
          },
        },
        relationsAsTarget: {
          include: {
            sourceApplication: true,
          },
        },
      },
    });
  }

  public async findById(id: string) {
    return await this.prisma.application.findUnique({
      where: { id },
      include: {
        actors: true,
        relationsAsSource: {
          include: {
            targetApplication: {
              select: { id: true, label: true },
            },
          },
        },
        relationsAsTarget: {
          include: {
            sourceApplication: {
              select: { id: true, label: true },
            },
          },
        },
      },
    });
  }
}

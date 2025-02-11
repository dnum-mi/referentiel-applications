import { PrismaClient } from '@prisma/client';
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
    actorsToCreate,
  ) {
    const mappedData = applicationMap(
      application,
      applicationMetadataId,
      ownerId,
      actorsToCreate,
    );
    return await this.prisma.application.create(mappedData);
  }

  public async findAll() {
    return await this.prisma.application.findMany();
  }
}

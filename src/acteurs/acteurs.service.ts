import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActActor } from '@prisma/client';
import { Acteur } from './entities/acture.entity';
import { CreateActeurDto } from './dto/create-acteur.dto';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';
import { UpdateActeurDto } from './dto/update-acteur.dto';
import moment from 'moment';

@Injectable()
export class ActeursService {
  constructor(
    private prisma: PrismaService,
    private readonly env: EnvironmentVariablesService,
  ) {}

  async create(username: string, data: CreateActeurDto): Promise<Acteur> {
    return this.prisma.actActor.create({
      data: {
        ...data,
        ...{
          createdby: username,
          updatedby: username,
          validationdate: moment()
            .add(this.env.ValidationDays, 'days')
            .toISOString(),
        },
      },
    });
  }

  async getOneById(id: string): Promise<Acteur | null> {
    return this.prisma.actActor.findUnique({
      where: {
        actorid: id,
      },
    });
  }

  async updateOneById(
    username: string,
    id: string,
    data: UpdateActeurDto,
  ): Promise<ActActor> {
    return this.prisma.actActor.update({
      where: {
        actorid: id,
      },
      data: {
        ...data,
        ...{
          updatedby: username,
        },
      },
    });
  }
}

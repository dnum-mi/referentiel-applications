import { Injectable } from '@nestjs/common';
import { IOrganizationRepository } from './organization.repository.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateOrganizationDto,
  PatchOrganizationDto,
} from 'src/organization/dto/organization.dto';
import { organizationMap } from 'src/organization/map/organization.map';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
  constructor(private prisma: PrismaService) {}

  public async create(organization: CreateOrganizationDto) {
    const mappedData = organizationMap(organization);
    return await this.prisma.organization.create(mappedData);
  }

  public async findAll() {
    return await this.prisma.organization.findMany();
  }

  public async findById(id: string) {
    return await this.prisma.organization.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  public async update(
    where: Prisma.OrganizationWhereUniqueInput,
    data: PatchOrganizationDto,
  ) {
    return await this.prisma.organization.update({ where, data });
  }

  public async delete(id: string) {
    return await this.prisma.organization.delete({ where: { id } });
  }
}

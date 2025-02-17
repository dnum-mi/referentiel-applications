import { Injectable } from '@nestjs/common';
import { IOrganizationRepository } from './organization.repository.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrganizationDto } from 'src/organization/dto/create-organization.dto';
import { organizationMap } from 'src/organization/map/organization.map';

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
}

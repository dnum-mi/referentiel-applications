import { PrismaService } from 'src/prisma/prisma.service';
import { IHostingRepository } from './hosting.repository.interface';
import { Injectable } from '@nestjs/common';
import { Hosting } from 'src/hosting/domain/hosting.entity';
import { CreateHostingDto } from 'src/hosting/applications/dto/create-hosting.dto';
import { UpdateHostingDto } from 'src/hosting/applications/dto/update-hosting.dto';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { application } from 'express';

@Injectable()
export class HostingRepository implements IHostingRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadatasService,
  ) {}

  async create(data: CreateHostingDto, ownerId: string): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = data;

    const createdHosting = await this.prisma.hosting.create({
      data: {
        ...rest,
        application: { connect: { id: applicationId } },
        ...(hostingOptionId && {
          hostingOption: { connect: { id: hostingOptionId } },
        }),
      },
    });

    await this.metadataService.updateOldestMetadataForApplication(
      applicationId,
      ownerId,
    );

    return createdHosting;
  }

  async findAll(): Promise<Hosting[]> {
    return this.prisma.hosting.findMany();
  }

  async findById(id: string): Promise<Hosting | null> {
    return this.prisma.hosting.findUnique({
      where: { id },
      include: {
        hostingOption: true,
      },
    });
  }

  async update(
    id: string,
    data: UpdateHostingDto,
    ownerId: string,
  ): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = data;

    const updatedHosting = await this.prisma.hosting.update({
      where: { id },
      data: {
        ...rest,
        ...(applicationId && {
          application: { connect: { id: applicationId } },
        }),
        ...(hostingOptionId && {
          hostingOption: { connect: { id: hostingOptionId } },
        }),
      },
    });

    await this.metadataService.updateOldestMetadataForApplication(
      applicationId,
      ownerId,
    );

    return updatedHosting;
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const deletedHosting = await this.prisma.hosting.findFirst({
      where: { id },
    });
    await this.metadataService.updateOldestMetadataForApplication(
      deletedHosting.applicationId,
      ownerId,
    );
    await this.prisma.hosting.delete({ where: { id } });
  }

  async findBySite(site: string): Promise<Hosting[]> {
    return this.prisma.hosting.findMany({
      where: {
        hostingOption: {
          site: {
            equals: site,
            mode: 'insensitive',
          },
        },
      },
      include: {
        hostingOption: true,
      },
    });
  }

  async findByApplicationId(applicationId: string): Promise<Hosting[]> {
    return this.prisma.hosting.findMany({
      where: { applicationId },
      include: {
        hostingOption: true,
      },
    });
  }

  async findApplicationsBySite(site: string): Promise<Hosting[]> {
    return this.prisma.hosting.findMany({
      where: {
        hostingOption: {
          site: {
            equals: site,
            mode: 'insensitive',
          },
        },
      },
      include: {
        application: true,
        hostingOption: true,
      },
    });
  }

  async findDistinctSites(): Promise<string[]> {
    const hostingOptionSites = await this.prisma.hostingOption.findMany({
      select: { site: true },
      distinct: ['site'],
      orderBy: { site: 'asc' },
    });

    return hostingOptionSites.map((r) => r.site);
  }
}

import { PrismaService } from 'src/prisma/prisma.service';
import { IHostingRepository } from './hosting.repository.interface';
import { Injectable } from '@nestjs/common';
import { Hosting } from 'src/hosting/domain/hosting.entity';
import { CreateHostingDto } from 'src/hosting/applications/dto/create-hosting.dto';
import { UpdateHostingDto } from 'src/hosting/applications/dto/update-hosting.dto';

@Injectable()
export class HostingRepository implements IHostingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateHostingDto): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = data;

    return this.prisma.hosting.create({
      data: {
        ...rest,
        application: { connect: { id: applicationId } },
        ...(hostingOptionId && {
          hostingOption: { connect: { id: hostingOptionId } },
        }),
      },
    });
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

  async update(id: string, data: UpdateHostingDto): Promise<Hosting> {
    const { applicationId, hostingOptionId, ...rest } = data;

    return this.prisma.hosting.update({
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
  }

  async delete(id: string): Promise<void> {
    await this.prisma.hosting.delete({ where: { id } });
  }

  async findBySite(site: string): Promise<Hosting[]> {
    return this.prisma.hosting.findMany({ where: { site } });
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
        OR: [
          {
            site: {
              equals: site,
              mode: 'insensitive',
            },
          },
          {
            hostingOption: {
              site: {
                equals: site,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: { application: true },
    });
  }

  async findDistinctSites(): Promise<string[]> {
    const results = await this.prisma.hosting.findMany({
      select: { site: true },
      distinct: ['site'],
      orderBy: { site: 'asc' },
    });

    // Also get sites from HostingOption
    const hostingOptionSites = await this.prisma.hostingOption.findMany({
      select: { site: true },
      distinct: ['site'],
      orderBy: { site: 'asc' },
    });

    const allSites = [
      ...results.map((r) => r.site).filter(Boolean),
      ...hostingOptionSites.map((r) => r.site),
    ];

    // Deduplicate sites
    return [...new Set(allSites)];
  }
}

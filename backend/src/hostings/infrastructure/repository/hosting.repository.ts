import { Injectable } from "@nestjs/common";
import {
  CreateHostingDto,
  UpdateHostingDto,
} from "src/hostings/dto/hosting.dto";
import { Hosting } from "src/hostings/entities/hosting.entity";
import { PrismaService } from "src/prisma/prisma.service";
import { IHostingRepository } from "./hosting.repository.interface";

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
      include: {
        hostingOption: true,
      },
    });
  }

  public async count(): Promise<number> {
    return this.prisma.hosting.count();
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

    return await this.prisma.hosting.update({
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
      include: {
        hostingOption: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.hosting.delete({ where: { id } });
  }

  async findBySite(site: string): Promise<Hosting[]> {
    return this.prisma.hosting.findMany({
      where: {
        hostingOption: {
          site: {
            equals: site,
            mode: "insensitive",
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

  async findDistinctSites(): Promise<string[]> {
    const hostingOptionSites = await this.prisma.hostingOption.findMany({
      select: { site: true },
      distinct: ["site"],
      orderBy: { site: "asc" },
    });

    return hostingOptionSites.map((r) => r.site);
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HostingOptionFiltersDto } from "./dto/hosting-option.dto";
import { BaseService } from "../common/base.service";
import type { HostingOption, Prisma } from "@prisma/client";

@Injectable()
export class HostingOptionService extends BaseService<HostingOption> {
  constructor(prisma: PrismaService) {
    super(prisma.hostingOption, prisma);
  }

  async findAll(filters?: HostingOptionFiltersDto) {
    const where: Prisma.HostingOptionWhereInput = {};
    if (filters) {
      if (filters.site) {
        where.site = { contains: filters.site, mode: "insensitive" };
      }
      if (filters.platform) {
        where.platform = { contains: filters.platform, mode: "insensitive" };
      }
      if (filters.provider) {
        where.provider = { contains: filters.provider, mode: "insensitive" };
      }
      if (filters.building) {
        where.building = { contains: filters.building, mode: "insensitive" };
      }
      if (filters.room) {
        where.room = { contains: filters.room, mode: "insensitive" };
      }
    }

    return this.prisma.hostingOption.findMany({
      where,
      orderBy: [{ site: "asc" }, { platform: "asc" }, { provider: "asc" }],
    });
  }

  async findDistinctSites() {
    const results = await this.prisma.hostingOption.findMany({
      select: { site: true },
      distinct: ["site"],
      orderBy: { site: "asc" },
    });
    return results.map(r => r.site);
  }

  async findDistinctPlatforms() {
    const results = await this.prisma.hostingOption.findMany({
      select: { platform: true },
      distinct: ["platform"],
      orderBy: { platform: "asc" },
    });
    return results.map(r => r.platform);
  }

  async findDistinctProviders() {
    const results = await this.prisma.hostingOption.findMany({
      select: { provider: true },
      distinct: ["provider"],
      orderBy: { provider: "asc" },
    });
    return results.map(r => r.provider);
  }
}

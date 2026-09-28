import type { HostingOption, Prisma } from "@prisma/client";
import { ConflictException, Injectable } from "@nestjs/common";
import { BaseService } from "../common/base.service";
import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponseDto } from "src/common/dto";
import {
  CreateHostingOptionDto,
  HostingOptionFiltersDto,
  HostingOptionWithUsageDto,
} from "./dto/hosting-option.dto";

// Champs couverts par la recherche et triables depuis l'écran d'administration : tout autre
// `sortBy` retombe sur l'ordre hiérarchique par défaut (fournisseur > plateforme > site >
// bâtiment > pièce).
const HOSTING_OPTION_FIELDS = [
  "provider",
  "platform",
  "site",
  "building",
  "room",
] as const;
type HostingOptionField = (typeof HOSTING_OPTION_FIELDS)[number];

const isHostingOptionField = (value?: string): value is HostingOptionField =>
  HOSTING_OPTION_FIELDS.includes(value as HostingOptionField);

@Injectable()
export class HostingOptionService extends BaseService<HostingOption> {
  constructor(prisma: PrismaService) {
    super(prisma.hostingOption, prisma);
  }

  async findAllHostingOptions(
    filters?: HostingOptionFiltersDto,
  ): Promise<PaginatedResponseDto<HostingOptionWithUsageDto>> {
    const where: Prisma.HostingOptionWhereInput = {};
    if (filters) {
      if (filters.search) {
        where.OR = HOSTING_OPTION_FIELDS.map((field) => ({
          [field]: { contains: filters.search, mode: "insensitive" },
        }));
      }
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

    const defaultOrder: Prisma.HostingOptionOrderByWithRelationInput[] = [
      { provider: "asc" },
      { platform: "asc" },
      { site: "asc" },
      { building: "asc" },
      { room: "asc" },
    ];
    const orderBy = isHostingOptionField(filters?.sortBy)
      ? [
          { [filters.sortBy]: filters.order ?? "asc" },
          ...defaultOrder.filter((o) => !(filters.sortBy in o)),
        ]
      : defaultOrder;

    const page = (await this.findAll({
      where,
      orderBy,
      // Le décompte permet à l'administrateur de mesurer l'impact d'une suppression : la FK
      // `ON DELETE SET NULL` détache silencieusement l'option de tous ces hébergements.
      include: { _count: { select: { hostings: true } } },
      page: filters?.page,
      pageSize: filters?.pageSize,
    })) as PaginatedResponseDto<
      HostingOption & { _count: { hostings: number } }
    >;

    return {
      ...page,
      results: page.results.map(({ _count, ...option }) => ({
        ...option,
        hostingsCount: _count.hostings,
      })),
    };
  }

  async createHostingOption(dto: CreateHostingOptionDto) {
    await this.assertNotDuplicate(dto);
    return this.create(dto);
  }

  async updateHostingOption(id: string, dto: CreateHostingOptionDto) {
    await this.assertNotDuplicate(dto, id);
    return this.update(id, dto);
  }

  /**
   * Le catalogue est proposé tel quel à la saisie d'un hébergement : deux options aux mêmes
   * fournisseur/plateforme/site/bâtiment/pièce seraient indiscernables pour le contributeur.
   * La comparaison ignore la casse, comme les filtres de recherche.
   */
  private async assertNotDuplicate(
    dto: CreateHostingOptionDto,
    excludedId?: string,
  ) {
    const equals = (value: string) => ({
      equals: value,
      mode: "insensitive" as const,
    });

    const duplicate = await this.prisma.hostingOption.findFirst({
      where: {
        provider: equals(dto.provider),
        platform: equals(dto.platform),
        site: equals(dto.site),
        building: dto.building ? equals(dto.building) : null,
        room: dto.room ? equals(dto.room) : null,
        ...(excludedId && { id: { not: excludedId } }),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        "Cette plateforme d'hébergement existe déjà dans le catalogue",
      );
    }
  }
}

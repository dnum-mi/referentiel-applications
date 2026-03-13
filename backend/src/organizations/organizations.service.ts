import { Injectable } from "@nestjs/common";
import { Organization, Prisma } from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { OrganizationFilterDto } from "./dto/filters.dto";
import {
  CreateOrganizationDto,
  OrganizationSearchResultDto,
} from "./dto/organizations.dto";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

@Injectable()
export class OrganizationsService extends BaseService<
  Organization,
  Prisma.OrganizationDelegate
> {
  constructor(
    prisma: PrismaService,
    private readonly queryBuilder: PrismaQueryBuilder,
  ) {
    super(prisma.organization, prisma);
  }

  async onApplicationBootstrap() {
    await this.recalculateClosureTable();
  }

  async create(data: CreateOrganizationDto): Promise<Organization> {
    const newOrg = await super.create(data);
    await this.recalculateClosureTable();
    return newOrg;
  }

  async find(
    filters: OrganizationFilterDto,
  ): Promise<OrganizationSearchResultDto> {
    const { page, pageSize } = filters;
    const where = this.queryBuilder.buildSearchWhere(filters);
    return this.findAll({ where, page, pageSize });
  }

  async update(
    id: string,
    data: Partial<CreateOrganizationDto>,
  ): Promise<Organization> {
    const patchedOrg = await super.update(id, data);
    await this.recalculateClosureTable();
    return patchedOrg;
  }

  async deleteSafe(id: string, force = false): Promise<void> {
    if (!force) {
      // Vérifier si l'organisation a des enfants
      const children = await this.prisma.organization.findMany({
        where: { parentId: id },
      });
      if (children.length > 0) {
        throw new Error(
          "Cannot delete organization with children. Use force delete.",
        );
      }
    }
    await this.prisma.organization.delete({ where: { id } });
    await this.prisma.organizationClosure.deleteMany({
      where: { descendantId: id },
    });
  }

  /**
   * Recalculates the closure table for the organization hierarchy.
   * This method should be called after any changes to the organization structure.
   * It ensures that the closure table reflects the current state of the organization tree.
   *
   * @returns {Promise<void>}
   */
  async recalculateClosureTable(): Promise<void> {
    // 1. On récupère tous les nœuds
    const allOrganizations = await this.prisma.organization.findMany();
    // On prépare un objet pour accéder par id
    const orgById = allOrganizations.reduce((acc, org) => {
      acc[org.id] = org;
      return acc;
    }, {});

    const closures: Prisma.OrganizationClosureCreateManyInput[] = [];

    // 2. Pour chaque nœud, on construit la liste de ses ancêtres (y compris lui-même)
    for (const organization of allOrganizations) {
      let depth = 0;
      let parent = organization;
      // On remonte la chaîne des parents
      while (parent) {
        closures.push({
          ancestorId: parent.id,
          descendantId: organization.id,
          depth,
        });
        // On commence par l’auto-référence (chaque nœud est son propre ancêtre)
        depth++;
        // On remonte au parent
        parent = orgById[parent.parentId];
      }
    }
    // 3. On vide la table des closures existantes et on insère les nouvelles
    await this.prisma.organizationClosure.deleteMany({});
    await this.prisma.organizationClosure.createMany({
      data: closures,
      skipDuplicates: true,
    });
  }
}

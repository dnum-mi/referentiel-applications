import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/organization.dto';
import { Organization, Prisma } from '@prisma/client';
import { BaseService } from 'src/common/base.service';

@Injectable()
export class OrganizationService extends BaseService<Organization> {
  constructor(prisma: PrismaService) {
    super(prisma.organization, prisma);
  }
  async onModuleInit() {
    await this.recalculateClosureTable();
  }
  async create(data: CreateOrganizationDto): Promise<Organization> {
    const newOrg = await this.prisma.organization.create({ data });
    await this.recalculateClosureTable();
    return newOrg;
  }

  async reduceToOrganizations(
    organizations: Prisma.PrismaPromise<Organization[]>,
  ): Promise<Record<string, Organization>> {
    return (await organizations).reduce((acc, org) => {
      acc[org.id] = org;
      return acc;
    }, {});
  }

  async findMultiple({
    ids,
    withAncestors,
    withChildren,
    search,
  }: {
    ids?: string[];
    withAncestors: boolean;
    withChildren: boolean;
    search?: string;
  }): Promise<Record<string, Organization>> {
    if (search) {
      return this.reduceToOrganizations(
        this.prisma.organization.findMany({
          where: {
            OR: [
              { label: { contains: search, mode: 'insensitive' } },
              { sigle: { contains: search, mode: 'insensitive' } },
              { url: { contains: search, mode: 'insensitive' } },
            ],
          },
        }),
      );
    }

    // si aucun ID n'est fourni, on retourne les organisations racines
    if (!ids || ids.length === 0) {
      return this.reduceToOrganizations(
        this.prisma.organization.findMany({
          where: { parentId: null },
        }),
      );
    }

    // sinon, on retourne les organisations correspondant aux IDs fournis
    // et on peut filtrer par ancêtres ou descendants si nécessaire

    const where: Prisma.OrganizationClosureWhereInput = {
      descendantId: { in: ids },
    };
    if (withAncestors) {
      where['ancestorId'] = { in: ids };
    }
    if (withChildren) {
      where['descendantId'] = { in: ids };
    }

    return (
      await this.prisma.organizationClosure.findMany({
        where,
        select: { ancestor: true, descendant: true },
      })
    ).reduce((acc, relation) => {
      acc[relation.ancestor.id] = relation.ancestor;
      if (withChildren) {
        acc[relation.descendant.id] = relation.descendant;
      }
      return acc;
    }, {});
  }

  async update(
    id: string,
    data: Partial<CreateOrganizationDto>,
  ): Promise<Organization> {
    const patchedOrg = await this.prisma.organization.update({
      where: { id },
      data,
    });
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
          'Cannot delete organization with children. Use force delete.',
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
    // 1. On vide la closure table
    await this.prisma.organizationClosure.deleteMany({});

    // 2. On récupère tous les nœuds
    const allOrganizations = await this.prisma.organization.findMany();

    // 3. Pour chaque nœud, on construit la liste de ses ancêtres (y compris lui-même)
    for (const organization of allOrganizations) {
      let depth = 0;
      let parent = organization;

      // On remonte la chaîne des parents
      while (parent) {
        // On commence par l’auto-référence (chaque nœud est son propre ancêtre)
        await this.prisma.organizationClosure.upsert({
          where: {
            ancestorId_descendantId: {
              ancestorId: parent.id,
              descendantId: organization.id,
            },
          },
          create: {
            ancestorId: parent.id,
            descendantId: organization.id,
            depth,
          },
          update: {
            depth,
          },
          include: {
            ancestor: true,
          },
        });
        depth++;
        // On remonte au parent
        parent =
          allOrganizations.find((org) => org.id === parent.parentId) || null;
      }
    }
  }
}

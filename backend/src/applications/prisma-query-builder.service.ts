import { Injectable } from "@nestjs/common";
import type { Prisma, RelationType } from "@prisma/client";
import { RelationTypeFilter } from "../product/application/dto/relation-type.dto";
import { ApplicationSearchFilters } from "src/applications/infrastructure/repository/application.repository.interface";

@Injectable()
export class PrismaQueryBuilder {
  public buildSearchWhere(
    filters: ApplicationSearchFilters,
    ownership?: { actorEmail?: string },
  ) {
    const { shortName, priorityRestart } = filters;

    // Build a single comprehensive where clause with all filters
    const where: { AND: Prisma.ApplicationWhereInput[] } = { AND: [] };

    if (ownership?.actorEmail) {
      where.AND.push({
        actors: {
          some: {
            email: {
              equals: ownership.actorEmail,
              mode: "insensitive" as const,
            },
          },
        },
      });
    }

    const filterConfigs = [
      {
        condition: filters.label,
        whereClause: {
          OR: [
            {
              label: {
                contains: filters.label,
                mode: "insensitive" as const,
              },
            },
            {
              labels: {
                some: {
                  value: {
                    contains: filters.label,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        },
      },
      {
        condition: filters.search,
        whereClause: {
          OR: [
            {
              label: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
            {
              labels: {
                some: {
                  value: {
                    contains: filters.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            {
              shortName: {
                contains: filters.search,
                mode: "insensitive" as const,
              },
            },
          ],
        },
      },
      {
        condition: filters.hostingSite,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                site: {
                  contains: filters.hostingSite,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingPlatform,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                platform: {
                  contains: filters.hostingPlatform,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingProvider,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                provider: {
                  contains: filters.hostingProvider,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingBuilding,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                building: {
                  contains: filters.hostingBuilding,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingRoom,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                room: {
                  contains: filters.hostingRoom,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.hostingSearch,
        whereClause: {
          hostings: {
            some: {
              hostingOption: {
                OR: [
                  {
                    site: {
                      contains: filters.hostingSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    platform: {
                      contains: filters.hostingSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    provider: {
                      contains: filters.hostingSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    building: {
                      contains: filters.hostingSearch,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    room: {
                      contains: filters.hostingSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        condition: filters.organization,
        whereClause: {
          actors: {
            some: {
              organization: {
                OR: [
                  {
                    path: {
                      contains: filters.organization,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    sigle: {
                      contains: filters.organization,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        condition: filters.actorType,
        whereClause: {
          actors: {
            some: {
              actorType: {
                code: {
                  equals: filters.actorType,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.actorEmail,
        whereClause: {
          actors: {
            some: {
              email: {
                equals: filters.actorEmail,
                mode: "insensitive" as const,
              },
            },
          },
        },
      },
      {
        condition: filters.missingMoa,
        whereClause: {
          actors: {
            none: {
              actorType: {
                code: {
                  equals: "MOA",
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.missingMoe,
        whereClause: {
          actors: {
            none: {
              actorType: {
                code: {
                  equals: "MOE",
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      },
      {
        condition: filters.missingHosting,
        whereClause: {
          hostings: {
            none: {},
          },
        },
      },
      {
        condition: filters.link,
        whereClause: {
          externalRessource: {
            some: {
              link: {
                contains: filters.link,
                mode: "insensitive" as const,
              },
            },
          },
        },
      },
      {
        condition: filters.tag?.length,
        whereClause: {
          tags: {
            some: {
              name: {
                in: filters.tag,
                mode: "insensitive" as const,
              },
            },
          },
        },
      },
      {
        condition: shortName,
        whereClause: {
          shortName: { contains: shortName, mode: "insensitive" as const },
        },
      },
      {
        condition: priorityRestart?.length,
        whereClause: {
          priorityRestart: { in: priorityRestart },
        },
      },
      {
        condition:
          filters.currentStatus__in?.length || filters.currentStatus__isNull,
        whereClause: {
          OR: [
            {
              currentStatus: {
                status: { in: filters.currentStatus__in ?? [] },
              },
            },
            {
              currentStatus:
                filters.currentStatus__isNull === true ? null : undefined,
            },
          ],
        },
      },
    ];

    filters.compliance__in?.forEach((compliance) => {
      switch (compliance) {
        case "homologation":
          where.AND.push({
            compliance: {
              homologation_status: { not: null },
            },
          });
          break;
        case "dsfr":
          where.AND.push({
            compliance: {
              dsfr_implemented: true,
            },
          });
          break;
        case "rgaa":
          where.AND.push({
            compliance: {
              rgaa_audit_date: { not: null },
            },
          });
          break;
        case "pdma":
          where.AND.push({
            compliance: {
              pdma_duration_hours: { not: null },
            },
          });
          break;
        case "dima":
          where.AND.push({
            compliance: {
              dima_duration_hours: { not: null },
            },
          });
          break;
      }
    });

    // Apply all filters using the configuration array
    filterConfigs.forEach(({ condition, whereClause }) => {
      if (condition) {
        where.AND.push(whereClause);
      }
    });

    // Always add quality filter
    where.AND.push({
      quality: {
        gte: filters.iqGte,
        lte: filters.iqLte,
      },
    });

    where.AND.push(this.buildRelationsQuery(filters));
    where.AND.push(this.buildBusinessDivision(filters));

    return where;
  }

  private buildRelationsQuery(
    filters: ApplicationSearchFilters,
  ): Prisma.ApplicationWhereInput {
    const includeQueries: Prisma.ApplicationWhereInput[] = [];
    const excludeQueries: Prisma.ApplicationWhereInput[] = [];
    const RELATION_TYPE_TO_SIDE = {
      is_part_of: {
        side: "relationsAsSource",
        foreignKey: "applicationTargetId",
      },
      in_replacement_of: {
        side: "relationsAsTarget",
        foreignKey: "applicationSourceId",
      },
      is_service_user_of: {
        side: "relationsAsSource",
        foreignKey: "applicationTargetId",
      },
      is_data_user_of: {
        side: "relationsAsSource",
        foreignKey: "applicationTargetId",
      },
      use_sso_of: {
        side: "relationsAsSource",
        foreignKey: "applicationTargetId",
      },
    } as const;

    const buildRelationQuery = (
      type: RelationType,
      value?: RelationTypeFilter,
      relationAppId?: string,
    ) => {
      const relationTypeToSide = RELATION_TYPE_TO_SIDE[type];
      const query: Prisma.ApplicationWhereInput = {
        [relationTypeToSide.side]: {
          some: {
            [relationTypeToSide.foreignKey]: relationAppId,
            type,
          },
        },
      };
      switch (value) {
        case "INCLUDE":
          includeQueries.push(query);
          return;
        case "EXCLUDE":
          excludeQueries.push({
            NOT: query,
          });
          return;
        case "NEUTRAL":
        default:
          return;
      }
    };

    const buildMediationServiceQuery = (
      value?: RelationTypeFilter,
      relationAppId?: string,
    ) => {
      if (!relationAppId) return;

      const query: Prisma.ApplicationWhereInput = {
        OR: [
          {
            relationsAsSource: { some: { mediationServiceId: relationAppId } },
          },
          {
            relationsAsTarget: { some: { mediationServiceId: relationAppId } },
          },
        ],
      };

      switch (value) {
        case "INCLUDE":
          includeQueries.push(query);
          return;
        case "EXCLUDE":
          excludeQueries.push({
            NOT: query,
          });
          return;
        case "NEUTRAL":
        default:
          return;
      }
    };

    buildRelationQuery("is_part_of", filters.is_part_of, filters.relationAppId);
    buildRelationQuery(
      "in_replacement_of",
      filters.in_replacement_of,
      filters.relationAppId,
    );
    buildRelationQuery(
      "is_service_user_of",
      filters.is_service_user_of,
      filters.relationAppId,
    );
    buildRelationQuery(
      "is_data_user_of",
      filters.is_data_user_of,
      filters.relationAppId,
    );
    buildRelationQuery("use_sso_of", filters.use_sso_of, filters.relationAppId);
    buildMediationServiceQuery(
      filters.is_mediation_service,
      filters.relationAppId,
    );

    return {
      AND: [...excludeQueries, { OR: includeQueries }],
    };
  }

  private buildBusinessDivision(filters: ApplicationSearchFilters) {
    return {
      businessDivisionId: filters.businessDivisionId,
    };
  }

  public buildOrderBy(
    sortBy: string | undefined,
    order: "asc" | "desc" | undefined,
  ): Prisma.ApplicationOrderByWithRelationInput {
    const safeOrder = order === "desc" ? "desc" : "asc";

    // Handle different sorting options with fallback
    const sortOptions: Record<
      string,
      Prisma.ApplicationOrderByWithRelationInput
    > = {
      hostingSite: { hostings: { _count: safeOrder } },
      shortName: { shortName: safeOrder },
      priorityRestart: { priorityRestart: safeOrder },
      quality: { quality: safeOrder },
      label: { label: safeOrder },
      businessDivision: { label: safeOrder },
      applicationViews: {
        applicationViews: {
          _count: safeOrder,
        },
      },
    };

    const sortKey = sortBy ?? "shortName";

    return sortOptions[sortKey] || { shortName: safeOrder };
  }

  public buildTechnicalDebtInfo() {
    return { technicalDebtInfo: { isNot: null } };
  }
}

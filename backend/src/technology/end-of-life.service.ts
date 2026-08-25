import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { PaginatedResponseDto } from "src/common/dto";
import {
  EndOfLifeApplicationDto,
  EndOfLifeFiltersDto,
  EndOfLifeTechnologyDto,
} from "./dto/end-of-life.dto";
import {
  computeEolStatus,
  eolStatusWhere,
  type EolStatus,
} from "./utils/eol-status";

/** Gravité décroissante — sert à trier les technologies d'une application. */
const SEVERITY: Record<EolStatus, number> = {
  eol: 0,
  "eol-soon": 1,
  "eoas-passed": 2,
};

/**
 * Vue transverse des fins de vie (#2236).
 *
 * Répond à « quelles applications utilisent une technologie en fin de vie ? »,
 * là où l'information n'existait que fiche par fiche (#1789, #2234).
 *
 * Les données lues sont celles déjà persistées sur `TechnologyStack` par la
 * résolution endoflife.date : cette vue ne déclenche aucun appel réseau, sans
 * quoi une page de quinze applications en provoquerait autant que de produits
 * distincts. C'est le cron de rafraîchissement qui garantit leur fraîcheur —
 * le rafraîchissement paresseux au GET d'une fiche ne couvre, lui, que les
 * fiches consultées.
 */
@Injectable()
export class EndOfLifeService {
  constructor(private readonly prisma: PrismaService) {}

  async findApplications(
    filters: EndOfLifeFiltersDto,
  ): Promise<PaginatedResponseDto<EndOfLifeApplicationDto>> {
    const now = new Date();
    const technologyWhere = eolStatusWhere(filters.status, now);

    const where: Prisma.ApplicationWhereInput = {
      technologies: { some: technologyWhere },
    };

    if (filters.organization) {
      // Même lecture que la recherche d'applications : le rattachement passe par
      // les acteurs, l'application ne porte pas d'organisation en propre.
      where.actors = {
        some: {
          organization: {
            OR: [
              { path: { contains: filters.organization, mode: "insensitive" } },
              {
                sigle: { contains: filters.organization, mode: "insensitive" },
              },
            ],
          },
        },
      };
    }

    if (filters.search) {
      const contains = {
        contains: filters.search,
        mode: "insensitive" as const,
      };
      where.OR = [
        { label: contains },
        { shortName: contains },
        // Le filtre produit est combiné DANS le même `some` que le filtre de
        // statut : deux `some` séparés seraient satisfaits par deux lignes
        // différentes, et une application dont le produit cherché est sain
        // remonterait au prétexte qu'une autre de ses technologies est en fin
        // de vie.
        {
          technologies: {
            some: { AND: [technologyWhere, { product: contains }] },
          },
        },
      ];
    }

    const paginated = await this.prisma.application.paginate({
      where,
      include: {
        technologies: { where: technologyWhere },
        actors: { select: { organization: { select: { path: true } } } },
      },
      orderBy: this.buildOrderBy(filters),
      page: filters.page,
      pageSize: filters.pageSize,
    });

    return {
      total: paginated.total,
      results: paginated.results.map((application) =>
        this.toDto(application, now),
      ),
    };
  }

  /**
   * Tri en base, donc compatible avec la pagination. Volontairement limité au
   * libellé : trier par gravité supposerait d'ordonner sur un agrégat de la
   * relation (la fin de vie la plus proche), ce que Prisma ne sait pas faire —
   * un tri appliqué après pagination ne classerait que la page courante et
   * donnerait l'illusion d'un classement global. Pour cibler l'urgent, c'est le
   * filtre `status` qui répond.
   */
  private buildOrderBy(
    filters: EndOfLifeFiltersDto,
  ): Prisma.ApplicationOrderByWithRelationInput {
    const order = filters.order === "desc" ? "desc" : "asc";
    return filters.sortBy === "shortName"
      ? { shortName: order }
      : { label: order };
  }

  private toDto(
    application: {
      id: string;
      label: string;
      shortName: string | null;
      technologies: {
        id: string;
        technology: string;
        product: string;
        version: string | null;
        eolDate: Date | null;
        eoasDate: Date | null;
        latestVersion: string | null;
      }[];
      actors: { organization: { path: string } | null }[];
    },
    now: Date,
  ): EndOfLifeApplicationDto {
    const technologies = application.technologies
      .map((technology) => {
        // `technologyWhere` a déjà écarté les lignes sans statut ; le repli sur
        // « eol » ne sert qu'à satisfaire le typage.
        const status = computeEolStatus(technology, now) ?? "eol";
        return {
          id: technology.id,
          technology: technology.technology,
          product: technology.product,
          version: technology.version,
          eolDate: technology.eolDate?.toISOString() ?? null,
          eoasDate: technology.eoasDate?.toISOString() ?? null,
          latestVersion: technology.latestVersion,
          status,
        } satisfies EndOfLifeTechnologyDto;
      })
      .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status]);

    const organizationPaths = [
      ...new Set(
        application.actors
          .map((actor) => actor.organization?.path)
          .filter((path): path is string => Boolean(path)),
      ),
    ].sort();

    return {
      id: application.id,
      label: application.label,
      shortName: application.shortName,
      organizationPaths,
      technologies,
      worstStatus: technologies[0]?.status ?? "eol",
    };
  }
}

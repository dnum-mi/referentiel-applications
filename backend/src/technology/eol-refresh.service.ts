import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { TechnologyEolSource } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import {
  isEndoflifeSwitchedOff,
  normalizeProductKey,
  parseEolInfo,
  resolveProductReleases,
  type EndoflifeRelease,
  type EolResolution,
} from "./utils/endoflife.utils";
import {
  ACTIVE_APPLICATION_WHERE,
  EOL_REFRESH_TTL_MS,
} from "./utils/eol-status";

/// Champs à écrire pour un produit résolu. Le cycle apparié est persisté sous
/// `eolCycle` (#2449) : avec des dates nulles seules, la fiche ne distinguerait
/// pas une version non reconnue (« MySQL 8 ») d'un cycle connu qui ne publie
/// aucune échéance (Apache 2.4).
function resolvedEolData(
  slug: string,
  releases: EndoflifeRelease[],
  version: string | null,
) {
  const { cycle, ...info } = parseEolInfo(releases, version ?? "");
  return {
    eolProduct: slug,
    ...info,
    eolCycle: cycle,
    eolCheckedAt: new Date(),
  };
}

export interface EolRefreshResult {
  /** Lignes de stack périmées au démarrage du run. */
  stale: number;
  /** Lignes effectivement réécrites. */
  updated: number;
  /** Lignes laissées en l'état, endoflife.date n'ayant pas répondu. */
  unavailable: number;
  /** Produits distincts résolus — une requête réseau chacun, au plus. */
  products: number;
}

/**
 * Recalcul global et planifié des fins de vie (#2236).
 *
 * Le rafraîchissement existant est **paresseux** : il ne se déclenche qu'au GET
 * d'une fiche, et seulement pour les technologies de cette fiche. Une
 * application que personne ne consulte n'est donc jamais recalculée — et c'est
 * précisément celle qu'une vue transverse doit signaler. Sans ce cron, la vue
 * afficherait la photographie du jour où chaque fiche a été ouverte pour la
 * dernière fois.
 *
 * Désactivé par défaut (`TECHNOLOGY_EOL_CRON_ENABLED`), comme les autres jobs
 * sortants du projet. Les alertes aux gestionnaires ont leur propre cron
 * (`EolNotificationService`, #2519) : elles ne dépendent plus de celui-ci.
 */
@Injectable()
export class EolRefreshService {
  private readonly logger = new Logger(EolRefreshService.name);
  private readonly cronEnabled: boolean;
  private readonly batchSize: number;
  private isRunning = false;
  /** Verrou consultatif Postgres (#2527) : deux réplicas ne doivent pas recalculer en même temps. */
  private static readonly ADVISORY_LOCK_KEY = 20260236;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled = this.configService.get<boolean>(
      "technology.eolCronEnabled",
      false,
    );
    this.batchSize = this.configService.get<number>(
      "technology.eolBatchSize",
      50,
    );
  }

  /** Nuit, avant la détection des corrélations (4 h) pour ne pas cumuler les charges. */
  @Cron("0 3 * * *", { timeZone: "Europe/Paris" })
  async handleScheduledRefresh(): Promise<void> {
    if (!this.cronEnabled) {
      this.logger.log(
        "Recalcul des fins de vie désactivé (TECHNOLOGY_EOL_CRON_ENABLED) : exécution planifiée ignorée.",
      );
      return;
    }
    // L'interrupteur général prime sur le cron : couper endoflife.date doit couper
    // TOUS ses appels, pas seulement ceux des fiches.
    if (isEndoflifeSwitchedOff()) {
      this.logger.log(
        "Appels à endoflife.date coupés (ENDOFLIFE_ENABLED=false) : exécution planifiée ignorée.",
      );
      return;
    }
    await this.runRefreshSafely();
  }

  /**
   * Lance le recalcul en garantissant qu'aucune exécution ne se chevauche : un
   * run peut durer, et deux runs concurrents doubleraient les appels sortants
   * vers endoflife.date sans rien apporter. Deux gardes : le drapeau mémoire
   * (même processus) et un verrou consultatif Postgres (#2527, plusieurs
   * réplicas ou un déclenchement manuel pendant le cron) tenu par une
   * transaction le temps du run — les écritures passent par le pool, la
   * transaction ne fait que porter le verrou.
   */
  async runRefreshSafely(): Promise<EolRefreshResult | null> {
    if (this.isRunning) {
      this.logger.warn(
        "Recalcul des fins de vie déjà en cours : nouvelle exécution ignorée.",
      );
      return null;
    }
    this.isRunning = true;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
            SELECT pg_try_advisory_xact_lock(${EolRefreshService.ADVISORY_LOCK_KEY}) AS locked`;
          if (!locked) {
            this.logger.warn(
              "Recalcul des fins de vie déjà en cours sur une autre instance : nouvelle exécution ignorée.",
            );
            return null;
          }
          const result = await this.runRefresh();
          this.logger.log(
            `Recalcul des fins de vie terminé : ${result.updated}/${result.stale} lignes mises à jour, ` +
              `${result.products} produits résolus, ${result.unavailable} lignes laissées en l'état.`,
          );
          return result;
        },
        { maxWait: 10_000, timeout: 2 * 60 * 60 * 1000 },
      );
    } catch (error) {
      this.logger.error(
        "Échec du recalcul des fins de vie",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async runRefresh(): Promise<EolRefreshResult> {
    const threshold = new Date(Date.now() - EOL_REFRESH_TTL_MS);
    const stale = await this.prisma.technologyStack.findMany({
      where: {
        // Les saisies manuelles (#2454) ne relèvent pas d'endoflife.date : les recalculer
        // remplacerait la date d'un humain par une résolution vouée à l'échec (produit
        // inconnu) ou, pire, par la date d'un autre produit homonyme.
        eolSource: { not: TechnologyEolSource.manual },
        OR: [{ eolCheckedAt: null }, { eolCheckedAt: { lt: threshold } }],
        // #2515 : inutile de rafraîchir (et d'appeler endoflife.date pour) une
        // application supprimée.
        application: ACTIVE_APPLICATION_WHERE,
      },
      select: { id: true, product: true, version: true },
      orderBy: { id: "asc" },
    });

    // Une seule requête réseau par produit distinct, pour TOUT le run : la même
    // version de PostgreSQL déclarée par cinquante applications ne doit pas
    // valoir cinquante appels.
    const resolutions = new Map<string, Promise<EolResolution>>();
    const resolve = (product: string) => {
      const key = normalizeProductKey(product);
      let pending = resolutions.get(key);
      if (!pending) {
        pending = resolveProductReleases(product);
        resolutions.set(key, pending);
      }
      return pending;
    };

    let updated = 0;
    let unavailable = 0;

    for (let index = 0; index < stale.length; index += this.batchSize) {
      const batch = stale.slice(index, index + this.batchSize);
      await Promise.all(
        batch.map(async (row) => {
          const resolution = await resolve(row.product);
          // Échec réseau : on ne réécrit RIEN. Écrire des null écraserait une
          // date valide, et réarmer `eolCheckedAt` figerait la ligne pour tout
          // le TTL alors qu'elle n'a pas été vérifiée.
          if (resolution.status === "unavailable") {
            unavailable += 1;
            return;
          }
          const data =
            resolution.status === "unknown-product"
              ? {
                  eolProduct: null,
                  eolDate: null,
                  eoasDate: null,
                  latestVersion: null,
                  eolCycle: null,
                  eolCheckedAt: new Date(),
                }
              : resolvedEolData(
                  resolution.slug,
                  resolution.releases,
                  row.version,
                );
          // Best-effort ligne à ligne : une écriture en échec — ligne supprimée
          // entre-temps, par exemple — ne doit pas interrompre le run. #2527 :
          // conditionnée à l'origine, pour ne jamais écraser une date saisie à la
          // main entre la sélection des lignes et l'écriture.
          const written = await this.prisma.technologyStack
            .updateMany({
              where: { id: row.id, eolSource: TechnologyEolSource.endoflife },
              data,
            })
            .then((result) => result.count > 0)
            .catch(() => false);
          if (written) updated += 1;
        }),
      );
    }

    return {
      stale: stale.length,
      updated,
      unavailable,
      products: resolutions.size,
    };
  }
}

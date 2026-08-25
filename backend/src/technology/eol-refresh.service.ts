import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";
import {
  normalizeProductKey,
  parseEolInfo,
  resolveProductReleases,
  type EolResolution,
} from "./utils/endoflife.utils";
import { EOL_REFRESH_TTL_MS } from "./utils/eol-status";
import { EolNotificationService } from "./eol-notification.service";

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
 * sortants du projet.
 */
@Injectable()
export class EolRefreshService {
  private readonly logger = new Logger(EolRefreshService.name);
  private readonly cronEnabled: boolean;
  private readonly batchSize: number;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eolNotificationService: EolNotificationService,
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
    await this.runRefreshSafely();
    // Les alertes viennent APRÈS le rafraîchissement, pour porter sur les dates du
    // jour et non sur celles de la veille. Leur échec ne doit pas faire échouer le
    // recalcul, qui est le cœur du job.
    await this.eolNotificationService
      .notifyPendingEndOfLife()
      .catch((error) => {
        this.logger.error(
          "Échec des notifications de fin de vie",
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  /**
   * Lance le recalcul en garantissant qu'aucune exécution ne se chevauche : un
   * run peut durer, et deux runs concurrents doubleraient les appels sortants
   * vers endoflife.date sans rien apporter.
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
      const result = await this.runRefresh();
      this.logger.log(
        `Recalcul des fins de vie terminé : ${result.updated}/${result.stale} lignes mises à jour, ` +
          `${result.products} produits résolus, ${result.unavailable} lignes laissées en l'état.`,
      );
      return result;
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
        OR: [{ eolCheckedAt: null }, { eolCheckedAt: { lt: threshold } }],
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
                  eolCheckedAt: new Date(),
                }
              : {
                  eolProduct: resolution.slug,
                  ...parseEolInfo(resolution.releases, row.version ?? ""),
                  eolCheckedAt: new Date(),
                };
          // Best-effort ligne à ligne : une écriture en échec — ligne supprimée
          // entre-temps, par exemple — ne doit pas interrompre le run.
          const written = await this.prisma.technologyStack
            .update({ where: { id: row.id }, data })
            .then(() => true)
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

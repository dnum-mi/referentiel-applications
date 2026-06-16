import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";

/** Un identifiant d'application accompagné de son score de pertinence full-text. */
export interface RankedApplication {
  id: string;
  rank: number;
}

/**
 * Moteur de recherche d'applications.
 *
 * En V0, il est implémenté par une recherche full-text PostgreSQL native
 * (vue matérialisée `application_search_index`). Cette interface est la couture
 * prévue pour brancher, en V1, une recherche assistée par LLM (reformulation de
 * la requête en langage naturel, reranking sémantique) sans rien changer au
 * service et au contrôleur qui la consomment.
 */
export interface ApplicationSearchEngine {
  fullTextSearch(query: string): Promise<RankedApplication[]>;
}

const MATERIALIZED_VIEW = "application_search_index";

@Injectable()
export class ApplicationSearchService implements ApplicationSearchEngine {
  private readonly logger = new Logger(ApplicationSearchService.name);
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private isRefreshing = false;
  private refreshQueued = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recherche full-text : renvoie les identifiants d'applications correspondant
   * à la requête, ordonnés par pertinence décroissante (`ts_rank`).
   *
   * Le texte est dé-accentué (`immutable_unaccent`) puis interprété via
   * `websearch_to_tsquery`, qui offre une syntaxe « grand public » :
   *   - `"expression exacte"` entre guillemets,
   *   - `motA OR motB`,
   *   - `-motExclu` pour exclure un terme.
   * Une chaîne vide renvoie une liste vide (aucun filtrage).
   */
  public async fullTextSearch(query: string): Promise<RankedApplication[]> {
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const rows = await this.prisma.$queryRaw<
      { applicationId: string; rank: number }[]
    >`
      SELECT asi."applicationId",
             ts_rank(asi.document, q.query)::float8 AS rank
      FROM application_search_index asi,
           websearch_to_tsquery('french', immutable_unaccent(${trimmed})) AS q(query)
      WHERE asi.document @@ q.query
      ORDER BY rank DESC
    `;

    return rows.map((row) => ({ id: row.applicationId, rank: row.rank }));
  }

  /**
   * Variante « préfixe » destinée à l'autocomplétion au fil de la frappe.
   *
   * Chaque mot saisi est transformé en motif préfixe (`mot:*`) puis combiné en
   * ET. Ainsi « tow muel » trouve « Towne, Mueller… » avant même que les mots
   * soient complets. Les caractères non alphanumériques sont retirés pour
   * produire une `to_tsquery` toujours valide (pas d'injection d'opérateurs).
   */
  public async fullTextSearchPrefix(
    query: string,
  ): Promise<RankedApplication[]> {
    const tokens = query
      ?.trim()
      .split(/\s+/)
      .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter(Boolean);

    if (!tokens?.length) return [];

    const tsQuery = tokens.map((token) => `${token}:*`).join(" & ");

    const rows = await this.prisma.$queryRaw<
      { applicationId: string; rank: number }[]
    >`
      SELECT asi."applicationId",
             ts_rank(asi.document, q.query)::float8 AS rank
      FROM application_search_index asi,
           to_tsquery('french', immutable_unaccent(${tsQuery})) AS q(query)
      WHERE asi.document @@ q.query
      ORDER BY rank DESC
    `;

    return rows.map((row) => ({ id: row.applicationId, rank: row.rank }));
  }

  /**
   * Rafraîchit l'index full-text. `CONCURRENTLY` évite de bloquer les lectures
   * pendant l'opération (requiert l'index unique sur `applicationId`).
   */
  public async refreshIndex(): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `REFRESH MATERIALIZED VIEW CONCURRENTLY ${MATERIALIZED_VIEW}`,
    );
  }

  /**
   * Planifie un rafraîchissement de l'index après une courte fenêtre. Les appels
   * rapprochés (création/édition en rafale, seed) sont coalescés en un seul
   * rafraîchissement effectif.
   */
  public scheduleRefresh(delayMs = 2000): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      void this.runRefreshSafely();
    }, delayMs);
  }

  /**
   * Filet de sécurité périodique : capte les modifications qui touchent le
   * document de recherche sans passer par le module applications (édition de
   * tags, labels ou acteurs via d'autres modules).
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  public handlePeriodicRefresh(): void {
    void this.runRefreshSafely();
  }

  /** Sérialise les rafraîchissements pour éviter qu'ils ne se chevauchent. */
  private async runRefreshSafely(): Promise<void> {
    if (this.isRefreshing) {
      this.refreshQueued = true;
      return;
    }
    this.isRefreshing = true;
    try {
      await this.refreshIndex();
    } catch (error) {
      this.logger.error(
        "Échec du rafraîchissement de l'index de recherche full-text",
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isRefreshing = false;
      if (this.refreshQueued) {
        this.refreshQueued = false;
        this.scheduleRefresh(0);
      }
    }
  }
}

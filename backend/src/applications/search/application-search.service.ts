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

/**
 * Plafond de résultats pour la recherche préfixe (autocomplétion). Un préfixe
 * court (« a ») peut matcher quasi toutes les applications ; l'autocomplétion
 * n'affiche que les premiers résultats, inutile de classer et transporter
 * l'intégralité de la base.
 */
const PREFIX_RESULT_LIMIT = 200;

/** Durée de vie du cache des résultats FTS. Courte : elle borne seulement la
 * staleness si l'index est rafraîchi par une autre instance de l'application. */
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 500;

@Injectable()
export class ApplicationSearchService implements ApplicationSearchEngine {
  private readonly logger = new Logger(ApplicationSearchService.name);
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private isRefreshing = false;
  private refreshQueued = false;
  /**
   * Cache mémoire des résultats par requête normalisée. L'index ne change
   * qu'au REFRESH de la vue matérialisée : le cache est vidé à ce moment-là
   * (+ TTL de sécurité). Il absorbe les requêtes répétées de l'autocomplétion
   * et les allers-retours de pagination sur une même recherche.
   */
  private readonly resultCache = new Map<
    string,
    { at: number; rows: RankedApplication[] }
  >();

  constructor(private readonly prisma: PrismaService) {}

  private getCached(key: string): RankedApplication[] | undefined {
    const entry = this.resultCache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.at > CACHE_TTL_MS) {
      this.resultCache.delete(key);
      return undefined;
    }
    return entry.rows;
  }

  private setCached(key: string, rows: RankedApplication[]): void {
    if (this.resultCache.size >= CACHE_MAX_ENTRIES) {
      // Éviction simple de la plus ancienne entrée (ordre d'insertion).
      const oldest = this.resultCache.keys().next().value;
      if (oldest !== undefined) this.resultCache.delete(oldest);
    }
    this.resultCache.set(key, { at: Date.now(), rows });
  }

  /**
   * Recherche full-text : renvoie les identifiants d'applications correspondant
   * à la requête, ordonnés par pertinence décroissante (`ts_rank`).
   *
   * Le texte est dé-accentué (`immutable_unaccent`) puis interprété via
   * `plainto_tsquery` : tous les mots saisis doivent être présents (ET), la
   * ponctuation est ignorée. On évite ainsi `websearch_to_tsquery`, dont les
   * opérateurs interprètent un `-` dans les données (ex. « Altenwerth - Goodwin »)
   * comme une exclusion. Une chaîne vide renvoie une liste vide (aucun filtrage).
   */
  public async fullTextSearch(query: string): Promise<RankedApplication[]> {
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const cacheKey = `f:${trimmed.toLowerCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.$queryRaw<
      { applicationId: string; rank: number }[]
    >`
      SELECT asi."applicationId",
             ts_rank(asi.document, q.query)::float8 AS rank
      FROM application_search_index asi,
           plainto_tsquery('french', immutable_unaccent(${trimmed})) AS q(query)
      WHERE asi.document @@ q.query
      ORDER BY rank DESC, asi."applicationId"
    `;

    const results = rows.map((row) => ({
      id: row.applicationId,
      rank: row.rank,
    }));
    this.setCached(cacheKey, results);
    return results;
  }

  /**
   * Variante « préfixe » destinée à l'autocomplétion au fil de la frappe.
   *
   * Chaque mot saisi est transformé en motif préfixe (`mot:*`) puis combiné en
   * ET. Ainsi « tow muel » trouve « Towne, Mueller… » avant même que les mots
   * soient complets. Les caractères non alphanumériques sont retirés pour
   * produire une `to_tsquery` toujours valide (pas d'injection d'opérateurs).
   *
   * Résultats plafonnés à {@link PREFIX_RESULT_LIMIT} : un préfixe très court
   * matcherait toute la base, or l'autocomplétion n'en affiche qu'une poignée.
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

    const cacheKey = `p:${tsQuery.toLowerCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const rows = await this.prisma.$queryRaw<
      { applicationId: string; rank: number }[]
    >`
      SELECT asi."applicationId",
             ts_rank(asi.document_simple, q.query)::float8 AS rank
      FROM application_search_index asi,
           to_tsquery('simple', immutable_unaccent(${tsQuery})) AS q(query)
      WHERE asi.document_simple @@ q.query
      ORDER BY rank DESC, asi."applicationId"
      LIMIT ${PREFIX_RESULT_LIMIT}
    `;

    const results = rows.map((row) => ({
      id: row.applicationId,
      rank: row.rank,
    }));
    this.setCached(cacheKey, results);
    return results;
  }

  /**
   * Rafraîchit l'index full-text. `CONCURRENTLY` évite de bloquer les lectures
   * pendant l'opération (requiert l'index unique sur `applicationId`).
   */
  public async refreshIndex(): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `REFRESH MATERIALIZED VIEW CONCURRENTLY ${MATERIALIZED_VIEW}`,
    );
    // L'index vient de changer : les résultats mémorisés sont périmés.
    this.resultCache.clear();
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

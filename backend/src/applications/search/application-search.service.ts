import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Permission } from "@prisma/client";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";

/** Un identifiant d'application accompagné de son score de pertinence full-text. */
export interface RankedApplication {
  id: string;
  rank: number;
}

interface SearchCandidate extends RankedApplication {
  /** null lorsque seuls les produits ou versions techniques correspondent. */
  rankWithoutTechnologies: number | null;
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
  fullTextSearch(
    query: string,
    requestor: Requestor,
  ): Promise<RankedApplication[]>;
}

const MATERIALIZED_VIEW = "application_search_index";

/**
 * Plafond de résultats pour la recherche préfixe (autocomplétion). Un préfixe
 * court (« a ») peut matcher quasi toutes les applications ; l'autocomplétion
 * n'affiche que les premiers résultats. Le plafond s'applique après contrôle
 * de TechnologyRead et classement : des correspondances interdites ne doivent
 * pas évincer les applications retrouvées par leurs autres informations.
 */
const PREFIX_RESULT_LIMIT = 1000;
const PERMISSION_BATCH_SIZE = 8;

/** Un segment ou préfixe de version, conservé entier par le parseur PostgreSQL. */
const NUMERIC_VERSION = /^\d+(?:\.\d+)*$/;

/** Durée de vie du cache des résultats FTS. Courte : elle borne seulement la
 * staleness si l'index est rafraîchi par une autre instance de l'application. */
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 500;

@Injectable()
export class ApplicationSearchService
  implements ApplicationSearchEngine, OnModuleDestroy
{
  private readonly logger = new Logger(ApplicationSearchService.name);
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private isRefreshing = false;
  private refreshQueued = false;
  private isShuttingDown = false;
  /**
   * Cache mémoire des résultats par requête normalisée. L'index ne change
   * qu'au REFRESH de la vue matérialisée : le cache est vidé à ce moment-là
   * (+ TTL de sécurité). Il absorbe les requêtes répétées de l'autocomplétion
   * et les allers-retours de pagination sur une même recherche. Seuls les
   * candidats bruts sont mémorisés : les droits sont revérifiés à chaque appel.
   */
  private readonly resultCache = new Map<
    string,
    { at: number; rows: SearchCandidate[] }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkPermissions: CheckPermissions,
  ) {}

  public onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshQueued = false;
  }

  private getCached(key: string): SearchCandidate[] | undefined {
    const entry = this.resultCache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.at > CACHE_TTL_MS) {
      this.resultCache.delete(key);
      return undefined;
    }
    return entry.rows;
  }

  private setCached(key: string, rows: SearchCandidate[]): void {
    if (this.resultCache.size >= CACHE_MAX_ENTRIES) {
      // Éviction simple de la plus ancienne entrée (ordre d'insertion).
      const oldest = this.resultCache.keys().next().value;
      if (oldest !== undefined) this.resultCache.delete(oldest);
    }
    this.resultCache.set(key, { at: Date.now(), rows });
  }

  private async rankAuthorizedCandidates(
    candidates: SearchCandidate[],
    requestor: Requestor,
  ): Promise<RankedApplication[]> {
    const results: RankedApplication[] = [];
    for (
      let offset = 0;
      offset < candidates.length;
      offset += PERMISSION_BATCH_SIZE
    ) {
      const batch = await Promise.all(
        candidates
          .slice(offset, offset + PERMISSION_BATCH_SIZE)
          .map(async (candidate) => {
            const { id, rank, rankWithoutTechnologies } = candidate;
            // Aucune donnée technique n'influence ce résultat : son autorisation
            // ne change ni sa présence ni son classement.
            if (rankWithoutTechnologies === rank) return { id, rank };

            const canRead = await this.checkPermissions.can(
              [Permission.TechnologyRead],
              requestor,
              id,
            );
            const effectiveRank = canRead ? rank : rankWithoutTechnologies;
            return effectiveRank === null ? null : { id, rank: effectiveRank };
          }),
      );
      results.push(...batch.filter((result) => result !== null));
    }
    // Nouveau tableau : ne jamais trier ou filtrer le cache partagé selon un utilisateur.
    return results.sort(
      (left, right) =>
        right.rank - left.rank || left.id.localeCompare(right.id),
    );
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
  public async fullTextSearch(
    query: string,
    requestor: Requestor,
  ): Promise<RankedApplication[]> {
    const trimmed = query?.trim();
    if (!trimmed) return [];

    const cacheKey = `f:${trimmed.toLowerCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return this.rankAuthorizedCandidates(cached, requestor);

    const rows = await this.prisma.$queryRaw<
      {
        applicationId: string;
        rank: number;
        rankWithoutTechnologies: number | null;
      }[]
    >`
      SELECT asi."applicationId",
             ts_rank(asi.document, q.query)::float8 AS rank,
             CASE WHEN asi.document_without_technologies @@ q.query
               THEN ts_rank(asi.document_without_technologies, q.query)::float8
               ELSE NULL
             END AS "rankWithoutTechnologies"
      FROM application_search_index asi,
           plainto_tsquery('french', immutable_unaccent(${trimmed})) AS q(query)
      WHERE asi.document @@ q.query
      ORDER BY rank DESC, asi."applicationId"
    `;

    const results = rows.map((row) => ({
      id: row.applicationId,
      rank: row.rank,
      rankWithoutTechnologies: row.rankWithoutTechnologies,
    }));
    this.setCached(cacheKey, results);
    return this.rankAuthorizedCandidates(results, requestor);
  }

  /**
   * Variante « préfixe » destinée à l'autocomplétion au fil de la frappe.
   *
   * Chaque mot saisi est transformé en motif préfixe (`mot:*`) puis combiné en
   * ET. Ainsi « tow muel » trouve « Towne, Mueller… » avant même que les mots
   * soient complets.
   *
   * La saisie est **découpée** sur tout caractère non alphanumérique (espaces ET
   * ponctuation), pas seulement sur les espaces : le parseur plein-texte de
   * Postgres segmente lui aussi sur la ponctuation (« O'Kon » → `o`,`kon` ;
   * « QA-GROUP-CHILD » → `qa`,`group`,`child`). Retirer la ponctuation *en
   * collant* les morceaux (« OKon », « QAGROUPCHILD ») produirait un lexème
   * absent de l'index : l'application devenait alors introuvable en tapant son
   * propre nom. Les versions numériques pointées restent toutefois entières :
   * PostgreSQL indexe « 15.5 » comme un seul lexème.
   *
   * Les versions techniques (poids D) sont indexées par préfixes de segments :
   * « 15.5.2 » contient aussi « 15 » et « 15.5 ». Les nombres doivent y matcher
   * exactement pour exclure « 150 » de « 15 ». Le préfixe reste autorisé sur
   * les autres champs (poids A/B/C), notamment « Budget 20 » -> « Budget 2026 ».
   *
   * Résultats plafonnés à {@link PREFIX_RESULT_LIMIT} : un préfixe très court
   * matcherait toute la base, or l'autocomplétion n'en affiche qu'une poignée.
   */
  public async fullTextSearchPrefix(
    query: string,
    requestor: Requestor,
  ): Promise<RankedApplication[]> {
    const tokens = query
      ?.trim()
      .match(/[\p{L}\p{N}]+(?:\.[\p{L}\p{N}]+)*/gu)
      ?.flatMap((token) =>
        NUMERIC_VERSION.test(token) ? [token] : token.split("."),
      );

    if (!tokens?.length) return [];

    const tsQuery = tokens
      .map((token) =>
        NUMERIC_VERSION.test(token)
          ? `(${token}:*ABC | ${token}:D)`
          : `${token}:*`,
      )
      .join(" & ");

    const cacheKey = `p:${tsQuery.toLowerCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached)
      return (await this.rankAuthorizedCandidates(cached, requestor)).slice(
        0,
        PREFIX_RESULT_LIMIT,
      );

    const rows = await this.prisma.$queryRaw<
      {
        applicationId: string;
        rank: number;
        rankWithoutTechnologies: number | null;
      }[]
    >`
      SELECT asi."applicationId",
             ts_rank(asi.document_simple, q.query)::float8 AS rank,
             CASE WHEN asi.document_simple_without_technologies @@ q.query
               THEN ts_rank(asi.document_simple_without_technologies, q.query)::float8
               ELSE NULL
             END AS "rankWithoutTechnologies"
      FROM application_search_index asi,
           to_tsquery('simple', immutable_unaccent(${tsQuery})) AS q(query)
      WHERE asi.document_simple @@ q.query
      ORDER BY rank DESC, asi."applicationId"
    `;

    const results = rows.map((row) => ({
      id: row.applicationId,
      rank: row.rank,
      rankWithoutTechnologies: row.rankWithoutTechnologies,
    }));
    this.setCached(cacheKey, results);
    return (await this.rankAuthorizedCandidates(results, requestor)).slice(
      0,
      PREFIX_RESULT_LIMIT,
    );
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
    if (this.isShuttingDown) return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
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
    if (this.isShuttingDown) return;
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

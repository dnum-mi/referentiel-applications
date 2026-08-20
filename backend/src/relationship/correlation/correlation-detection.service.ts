import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";

/** Signaux bruts d'une paire candidate, calculés en SQL. */
export interface CorrelationSignals {
  /** Similarité trigramme (pg_trgm) maximale entre labels et shortNames [0..1] */
  nameSimilarity: number;
  /** Nombre de DataDescription partagées (utilisées ou produites par les deux) */
  sharedDataCount: number;
  /** Nombre d'acteurs communs (même email sur les deux applications) */
  sharedActorCount: number;
}

interface CandidateRow extends CorrelationSignals {
  applicationSourceId: string;
  applicationTargetId: string;
}

/** Pondérations des signaux dans le score final. */
export interface CorrelationWeights {
  nameSimilarity: number;
  sharedData: number;
  sharedActors: number;
}

/** Résumé d'une exécution de la détection. */
export interface CorrelationDetectionResult {
  /** Paires candidates remontées par la requête SQL (avant seuil) */
  candidateCount: number;
  /** Suggestions PENDING créées */
  createdCount: number;
  /** Suggestions PENDING existantes dont le score/les signaux ont été rafraîchis */
  updatedCount: number;
}

/**
 * Nombre de données partagées au-delà duquel le signal « données » sature à 1.
 * Trois données communes suffisent à considérer le recouvrement fonctionnel
 * comme maximal ; au-delà, le score n'augmente plus.
 */
const SHARED_DATA_SATURATION = 3;
/** Idem pour les acteurs communs : deux acteurs partagés saturent le signal. */
const SHARED_ACTOR_SATURATION = 2;

/**
 * Moteur de détection des corrélations entre applications (#2281, #2284).
 *
 * Les croisements sont faits en SQL (pas de N² en mémoire applicative) :
 * - similarité trigramme des label/shortName via `%` et `similarity()` de
 *   pg_trgm (index Application_label_trgm_idx / Application_shortName_trgm_idx) ;
 * - DataDescription partagées via `DataApplication` et la table de liaison
 *   `_ApplicationToDataDescription` (applications sources) ;
 * - acteurs communs par email.
 *
 * Chaque paire candidate reçoit un score pondéré ; au-dessus du seuil, une
 * suggestion PENDING est créée (ou son score rafraîchi si la paire est déjà
 * PENDING). Les paires déjà reliées par une Relation (tout type), déjà revues
 * (ACCEPTED/REJECTED) ou impliquant une application supprimée sont exclues.
 */
@Injectable()
export class CorrelationDetectionService {
  private readonly logger = new Logger(CorrelationDetectionService.name);
  private readonly cronEnabled: boolean;
  private readonly scoreThreshold: number;
  private readonly weights: CorrelationWeights;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled = this.configService.get<boolean>(
      "correlation.cronEnabled",
      false,
    );
    this.scoreThreshold = this.configService.get<number>(
      "correlation.scoreThreshold",
      0.6,
    );
    this.weights = this.configService.get<CorrelationWeights>(
      "correlation.weights",
      { nameSimilarity: 0.5, sharedData: 0.3, sharedActors: 0.2 },
    );
  }

  /**
   * Job planifié quotidien (heure creuse), désactivable par
   * CORRELATION_CRON_ENABLED.
   */
  @Cron("0 4 * * *", { timeZone: "Europe/Paris" })
  async handleScheduledDetection(): Promise<void> {
    if (!this.cronEnabled) {
      this.logger.log(
        "Détection des corrélations désactivée (CORRELATION_CRON_ENABLED) : exécution planifiée ignorée.",
      );
      return;
    }
    await this.runDetectionSafely();
  }

  /**
   * Lance la détection en garantissant qu'aucune exécution ne se chevauche :
   * si un run est déjà en cours (cron + déclenchement manuel simultanés), le
   * nouvel appel est ignoré et renvoie null.
   */
  async runDetectionSafely(): Promise<CorrelationDetectionResult | null> {
    if (this.isRunning) {
      this.logger.warn(
        "Détection des corrélations déjà en cours : nouvelle exécution ignorée.",
      );
      return null;
    }
    this.isRunning = true;
    try {
      return await this.runDetection();
    } catch (error) {
      this.logger.error(
        "Échec de la détection des corrélations",
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /** Exécution effective : candidats SQL → score → upsert des PENDING. */
  private async runDetection(): Promise<CorrelationDetectionResult> {
    const candidates = await this.findCandidatePairs();
    let createdCount = 0;
    let updatedCount = 0;

    for (const candidate of candidates) {
      const score = this.computeScore(candidate);
      if (score < this.scoreThreshold) {
        continue;
      }
      const signals: CorrelationSignals = {
        nameSimilarity: candidate.nameSimilarity,
        sharedDataCount: candidate.sharedDataCount,
        sharedActorCount: candidate.sharedActorCount,
      };

      // Rafraîchit la suggestion si la paire est encore PENDING ; sinon crée.
      // `skipDuplicates` protège du cas limite d'une paire revue entre la
      // requête de candidats et l'écriture (jamais d'écrasement d'une revue).
      const updated = await this.prisma.correlationSuggestion.updateMany({
        where: {
          applicationSourceId: candidate.applicationSourceId,
          applicationTargetId: candidate.applicationTargetId,
          status: "PENDING",
        },
        data: { score, signals: signals as unknown as Prisma.InputJsonValue },
      });
      if (updated.count > 0) {
        updatedCount += updated.count;
        continue;
      }
      const created = await this.prisma.correlationSuggestion.createMany({
        data: [
          {
            applicationSourceId: candidate.applicationSourceId,
            applicationTargetId: candidate.applicationTargetId,
            score,
            signals: signals as unknown as Prisma.InputJsonValue,
          },
        ],
        skipDuplicates: true,
      });
      createdCount += created.count;
    }

    this.logger.log(
      `Détection des corrélations terminée : ${candidates.length} paires candidates, ${createdCount} suggestions créées, ${updatedCount} rafraîchies.`,
    );
    return { candidateCount: candidates.length, createdCount, updatedCount };
  }

  /**
   * Score pondéré d'une paire candidate. Les compteurs (données, acteurs) sont
   * normalisés en [0..1] avec saturation pour rester comparables à la
   * similarité de nom.
   *
   * Conséquence des poids par défaut, à garder en tête avant de régler le
   * seuil : le nom pesant 0,5, deux applications au libellé identique
   * plafonnent à 0,50 et restent sous un seuil de 0,6 — un second signal est
   * toujours nécessaire. C'est voulu (deux instances régionales d'un même
   * produit portent le même nom sans être des doublons), mais cela écarte
   * aussi le doublon le plus évident. La marche à suivre pour calibrer sur les
   * données d'un environnement est dans docs/12-exploitation-deploiement.md.
   */
  computeScore(signals: CorrelationSignals): number {
    const dataSignal = Math.min(
      signals.sharedDataCount / SHARED_DATA_SATURATION,
      1,
    );
    const actorSignal = Math.min(
      signals.sharedActorCount / SHARED_ACTOR_SATURATION,
      1,
    );
    return (
      this.weights.nameSimilarity * signals.nameSimilarity +
      this.weights.sharedData * dataSignal +
      this.weights.sharedActors * actorSignal
    );
  }

  /**
   * Paires candidates avec leurs signaux, croisées et filtrées en SQL.
   *
   * Les paires sont toujours produites en ordre canonique (id_a < id_b,
   * cf. normalizeCorrelationPair) : LEAST/GREATEST et les jointures `<`
   * garantissent l'unicité de la paire quel que soit le signal d'origine.
   *
   * Le rapprochement par nom est éclaté en deux branches UNION plutôt qu'en
   * un `OR` : avec le `OR`, Postgres ne peut exploiter qu'un seul des deux
   * index trigrammes et retombe sur un balayage complet. Mesuré sur 924
   * applications : 3 122 ms en `OR` contre 432 ms en `UNION`, pour très
   * exactement les mêmes paires. La similarité est recalculée après l'union,
   * sur les seules paires retenues ; sur la requête complète, 17 233 lignes
   * en 637 ms au lieu de 3 243 ms, au résultat près.
   */
  private async findCandidatePairs(): Promise<CandidateRow[]> {
    return await this.prisma.$queryRaw<CandidateRow[]>`
      WITH name_pairs AS (
        SELECT a.id AS id_a, b.id AS id_b
        FROM "Application" a
        JOIN "Application" b ON a.id < b.id
        WHERE a.label % b.label
        UNION
        SELECT a.id, b.id
        FROM "Application" a
        JOIN "Application" b ON a.id < b.id
        WHERE a."shortName" IS NOT NULL AND b."shortName" IS NOT NULL
          AND a."shortName" % b."shortName"
      ),
      candidate_names AS (
        SELECT p.id_a,
               p.id_b,
               GREATEST(
                 similarity(a.label, b.label),
                 COALESCE(similarity(a."shortName", b."shortName"), 0)
               )::float8 AS name_similarity
        FROM name_pairs p
        JOIN "Application" a ON a.id = p.id_a
        JOIN "Application" b ON b.id = p.id_b
      ),
      shared_data AS (
        SELECT pairs.id_a, pairs.id_b,
               COUNT(DISTINCT pairs.data_description_id)::int AS shared_data_count
        FROM (
          SELECT da1."applicationId" AS id_a,
                 da2."applicationId" AS id_b,
                 da1."dataDescriptionId" AS data_description_id
          FROM "DataApplication" da1
          JOIN "DataApplication" da2
            ON da1."dataDescriptionId" = da2."dataDescriptionId"
           AND da1."applicationId" < da2."applicationId"
          UNION
          SELECT LEAST(s1."A", s2."A"),
                 GREATEST(s1."A", s2."A"),
                 s1."B"
          FROM "_ApplicationToDataDescription" s1
          JOIN "_ApplicationToDataDescription" s2
            ON s1."B" = s2."B" AND s1."A" < s2."A"
        ) pairs
        GROUP BY pairs.id_a, pairs.id_b
      ),
      shared_actors AS (
        SELECT a1."applicationId" AS id_a,
               a2."applicationId" AS id_b,
               COUNT(DISTINCT lower(a1.email))::int AS shared_actor_count
        FROM "Actor" a1
        JOIN "Actor" a2
          ON lower(a1.email) = lower(a2.email)
         AND a1."applicationId" < a2."applicationId"
        WHERE a1.email IS NOT NULL AND a1.email <> ''
        GROUP BY a1."applicationId", a2."applicationId"
      ),
      merged AS (
        SELECT id_a, id_b,
               MAX(name_similarity)::float8 AS name_similarity,
               MAX(shared_data_count)::int AS shared_data_count,
               MAX(shared_actor_count)::int AS shared_actor_count
        FROM (
          SELECT id_a, id_b, name_similarity, 0 AS shared_data_count, 0 AS shared_actor_count
          FROM candidate_names
          UNION ALL
          SELECT id_a, id_b, 0, shared_data_count, 0 FROM shared_data
          UNION ALL
          SELECT id_a, id_b, 0, 0, shared_actor_count FROM shared_actors
        ) all_signals
        GROUP BY id_a, id_b
      )
      SELECT m.id_a AS "applicationSourceId",
             m.id_b AS "applicationTargetId",
             m.name_similarity AS "nameSimilarity",
             m.shared_data_count AS "sharedDataCount",
             m.shared_actor_count AS "sharedActorCount"
      FROM merged m
      JOIN "Application" a ON a.id = m.id_a
      JOIN "Application" b ON b.id = m.id_b
      LEFT JOIN "ApplicationStatus" sa ON sa.id = a."currentStatusId"
      LEFT JOIN "ApplicationStatus" sb ON sb.id = b."currentStatusId"
      WHERE (sa.status IS NULL OR sa.status <> 'deleted')
        AND (sb.status IS NULL OR sb.status <> 'deleted')
        AND NOT EXISTS (
          SELECT 1 FROM "Relation" r
          WHERE (r."applicationSourceId" = m.id_a AND r."applicationTargetId" = m.id_b)
             OR (r."applicationSourceId" = m.id_b AND r."applicationTargetId" = m.id_a)
        )
        AND NOT EXISTS (
          SELECT 1 FROM "CorrelationSuggestion" cs
          WHERE cs."applicationSourceId" = m.id_a
            AND cs."applicationTargetId" = m.id_b
            AND cs.status <> 'PENDING'
        )
    `;
  }
}

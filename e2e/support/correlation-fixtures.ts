import { createRequire } from "node:module";
import type { CorrelationQaFixture } from "../../backend/prisma/qa-correlation-fixtures";
import { dbQuery } from "./db";

// Le backend est CommonJS et le package e2e est ESM. Le chargeur TypeScript
// de Playwright traite le require, sans imposer une installation du backend.
const { correlationQaFixture } = createRequire(import.meta.url)(
  "../../backend/prisma/qa-correlation-fixtures.ts",
) as typeof import("../../backend/prisma/qa-correlation-fixtures");
export { correlationQaFixture };

/**
 * Pas d'endpoint de remise en attente d'une revue : cette préparation SQL ne
 * touche que la paire QA du scénario et du navigateur courant. Les actions
 * métier (détection, acceptation, rejet) restent effectuées dans l'interface.
 */
export async function restorePendingCorrelation(fixture: CorrelationQaFixture) {
  if (fixture.scenario === "accepted") {
    throw new Error(
      "La fixture pré-acceptée ne doit pas être remise en attente",
    );
  }
  await requireCorrelationSeed(fixture);
  const pair = [fixture.source.id, fixture.target.id];
  await dbQuery(
    `DELETE FROM "Relation"
     WHERE type = 'is_correlated_with' AND
       (("applicationSourceId" = $1 AND "applicationTargetId" = $2) OR
        ("applicationSourceId" = $2 AND "applicationTargetId" = $1))`,
    pair,
  );
  // L'acceptation écrit une trace sur chacune des deux fiches. Conserver
  // leurs métadonnées initiales ; supprimer uniquement les traces de cette paire.
  await dbQuery(
    `DELETE FROM "Metadata"
     WHERE ("applicationId" = $1 AND description LIKE '%' || $4 || '%')
        OR ("applicationId" = $2 AND description LIKE '%' || $3 || '%')`,
    [...pair, fixture.source.label, fixture.target.label],
  );
  await dbQuery(
    `INSERT INTO "CorrelationSuggestion"
       (id, "applicationSourceId", "applicationTargetId", score, signals, status, "createdAt")
     VALUES ($1, $2, $3, 0.6 * similarity($4, $5) + 0.25 / 3,
       jsonb_build_object('nameSimilarity', similarity($4, $5),
         'sharedDataCount', 1, 'sharedActorCount', 0), 'PENDING', CURRENT_TIMESTAMP)
     ON CONFLICT ("applicationSourceId", "applicationTargetId") DO UPDATE
     SET status = 'PENDING', "reviewedById" = NULL, "reviewedAt" = NULL,
       score = EXCLUDED.score, signals = EXCLUDED.signals`,
    [fixture.suggestionId, ...pair, fixture.source.label, fixture.target.label],
  );
}

/** Supprime la seule suggestion QA pour prouver que le moteur sait la recréer. */
export async function removePendingCorrelation(fixture: CorrelationQaFixture) {
  const deleted = await dbQuery<{ id: string }>(
    `DELETE FROM "CorrelationSuggestion"
     WHERE "applicationSourceId" = $1 AND "applicationTargetId" = $2
       AND status = 'PENDING' RETURNING id`,
    [fixture.source.id, fixture.target.id],
  );
  if (deleted.length !== 1)
    throw new Error("La suggestion QA en attente doit être unique");
}

/** Absence de résidus de seed : exactement deux applications et une donnée liée aux deux. */
export async function requireCorrelationSeed(fixture: CorrelationQaFixture) {
  const [counts] = await dbQuery<{
    applications: number;
    applicationLabels: number;
    descriptions: number;
    descriptionNames: number;
    sources: number;
  }>(
    `SELECT
      (SELECT count(*)::int FROM "Application"
       WHERE (id = $1 AND label = $3) OR (id = $2 AND label = $4)) AS applications,
      (SELECT count(*)::int FROM "Application" WHERE label IN ($3, $4)) AS "applicationLabels",
      (SELECT count(*)::int FROM "DataDescription" WHERE id = $5 AND name = $6) AS descriptions,
      (SELECT count(*)::int FROM "DataDescription" WHERE name = $6) AS "descriptionNames",
      (SELECT count(*)::int FROM "_ApplicationToDataDescription"
       WHERE "A" IN ($1, $2) AND "B" = $5) AS sources`,
    [
      fixture.source.id,
      fixture.target.id,
      fixture.source.label,
      fixture.target.label,
      fixture.data.id,
      fixture.data.name,
    ],
  );
  if (
    counts?.applications !== 2 ||
    counts.applicationLabels !== 2 ||
    counts.descriptions !== 1 ||
    counts.descriptionNames !== 1 ||
    counts.sources !== 2
  ) {
    throw new Error(
      `Fixture de corrélation ${fixture.project}/${fixture.scenario} absente ou incomplète : ` +
        "appliquer le seed principal puis pnpm db:seed:qa sur la base E2E.",
    );
  }
}

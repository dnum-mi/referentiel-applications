import { BadRequestException } from "@nestjs/common";

/**
 * Paire d'applications en ordre canonique pour les corrélations (#2281).
 *
 * La corrélation est symétrique : pour que les contraintes d'unicité
 * (`CorrelationSuggestion` et `Relation` avec le type `is_correlated_with`)
 * empêchent le doublon A→B / B→A, la paire est toujours stockée avec
 * `applicationSourceId < applicationTargetId` (ordre lexicographique).
 */
export interface CorrelationPair {
  applicationSourceId: string;
  applicationTargetId: string;
}

/**
 * Normalise une paire d'identifiants d'applications en ordre canonique.
 * Rejette la corrélation d'une application avec elle-même.
 */
export function normalizeCorrelationPair(
  applicationIdA: string,
  applicationIdB: string,
): CorrelationPair {
  if (applicationIdA === applicationIdB) {
    throw new BadRequestException(
      "Une application ne peut pas être corrélée avec elle-même",
    );
  }
  return applicationIdA < applicationIdB
    ? {
        applicationSourceId: applicationIdA,
        applicationTargetId: applicationIdB,
      }
    : {
        applicationSourceId: applicationIdB,
        applicationTargetId: applicationIdA,
      };
}

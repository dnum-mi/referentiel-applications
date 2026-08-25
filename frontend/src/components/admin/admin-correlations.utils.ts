import type { CorrelationSuggestionDto, CorrelationSuggestionStatus } from "@/client/types.gen";

/** Libellés d'affichage des statuts de suggestion de corrélation (#2286). */
export const correlationStatusLabels: Record<CorrelationSuggestionStatus, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Rejetée",
};

/** Types de badge acceptés par DsfrBadge : l'union littérale, pas `string`. */
type DsfrBadgeType = "error" | "info" | "success" | "warning" | "new";

export const correlationStatusBadgeType: Record<CorrelationSuggestionStatus, DsfrBadgeType> = {
  PENDING: "new",
  ACCEPTED: "success",
  REJECTED: "error",
};

export function formatCorrelationScore(score: number): string {
  return `${Math.round(score * 100)} %`;
}

export interface CorrelationSignalBadge {
  key: "name" | "data" | "actors";
  label: string;
}

/**
 * Badges des signaux ayant contribué au score : similarité de nom, données
 * partagées, acteurs communs. Un signal nul n'est pas affiché.
 */
export function correlationSignalBadges(suggestion: CorrelationSuggestionDto): CorrelationSignalBadge[] {
  const { nameSimilarity, sharedDataCount, sharedActorCount } = suggestion.signals;
  const badges: CorrelationSignalBadge[] = [];
  if (nameSimilarity > 0) {
    badges.push({ key: "name", label: `Nom similaire à ${Math.round(nameSimilarity * 100)} %` });
  }
  if (sharedDataCount > 0) {
    badges.push({
      key: "data",
      label: sharedDataCount > 1 ? `${sharedDataCount} données partagées` : "1 donnée partagée",
    });
  }
  if (sharedActorCount > 0) {
    badges.push({
      key: "actors",
      label: sharedActorCount > 1 ? `${sharedActorCount} acteurs communs` : "1 acteur commun",
    });
  }
  return badges;
}

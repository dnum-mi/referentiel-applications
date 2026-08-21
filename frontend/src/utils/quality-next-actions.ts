import type { QualitySummaryDto } from "@/client/types.gen";

export type QualityImpact = "high" | "medium" | "low";

export interface QualityNextAction {
  key: string;
  label: string;
  tabId: string;
  impact: QualityImpact;
}

interface QualityActionDefinition extends QualityNextAction {
  isDone: (summary: QualitySummaryDto) => boolean;
}

// Reflète les 3 paliers d'importance de `calculateIQ` (backend/src/common/utils/quality.utils.ts).
// Le barème y est dégressif et par palier (pas un simple total de points par critère) : compléter
// un même champ peut valoir de +1 à +50 points selon l'état des autres critères du même palier.
// Afficher un delta de points exact serait donc trompeur — on indique seulement l'ordre de
// grandeur de l'impact (fort / moyen / secondaire), pas un score.
const ACTIONS: readonly QualityActionDefinition[] = [
  {
    key: "description",
    label: "Ajouter une description à l'application",
    tabId: "tab-infos",
    impact: "high",
    isDone: (s) => s.hasDescription,
  },
  {
    key: "hosting",
    label: "Renseigner l'hébergement de l'application",
    tabId: "tab-infos",
    impact: "high",
    isDone: (s) => s.hasHosting,
  },
  {
    key: "moa",
    label: "Ajouter un acteur Maîtrise d'Ouvrage (MOA)",
    tabId: "tab-actors",
    impact: "high",
    isDone: (s) => s.actors.MOA,
  },
  {
    key: "moe",
    label: "Ajouter un acteur Maîtrise d'Œuvre (MOE)",
    tabId: "tab-actors",
    impact: "medium",
    isDone: (s) => s.actors.MOE,
  },
  {
    key: "tma",
    label: "Ajouter un acteur Tierce Maintenance Applicative (TMA)",
    tabId: "tab-actors",
    impact: "medium",
    isDone: (s) => s.actors.TMA,
  },
  {
    key: "heb",
    label: "Ajouter un acteur Responsable de l'hébergement",
    tabId: "tab-actors",
    impact: "low",
    isDone: (s) => s.actors.HEB,
  },
  {
    key: "rep",
    label: "Ajouter un acteur Responsable d'exploitation",
    tabId: "tab-actors",
    impact: "low",
    isDone: (s) => s.actors.REP,
  },
  {
    key: "pdma",
    label: "Amorcer la conformité PDMA (perte de données maximale admissible)",
    tabId: "tab-compliances",
    impact: "low",
    isDone: (s) => s.compliances.PDMA,
  },
  {
    key: "dima",
    label: "Amorcer la conformité DIMA (durée d'interruption maximale admissible)",
    tabId: "tab-compliances",
    impact: "low",
    isDone: (s) => s.compliances.DIMA,
  },
  {
    key: "homologation",
    label: "Renseigner la date de fin d'homologation",
    tabId: "tab-compliances",
    impact: "low",
    isDone: (s) => s.compliances.HOMOLOGATION,
  },
  {
    key: "snapvisu",
    label: "Ajouter un lien de supervision Snapvisu",
    tabId: "tab-links",
    impact: "low",
    isDone: (s) => s.hasSnapvisu,
  },
];

const IMPACT_ORDER: Record<QualityImpact, number> = { high: 0, medium: 1, low: 2 };

// Liste des actions restant à faire, triée par impact décroissant : les critères les
// plus structurants (palier 1) d'abord, les plus secondaires (palier 3) en dernier.
export function getQualityNextActions(summary: QualitySummaryDto): QualityNextAction[] {
  return ACTIONS.filter((action) => !action.isDone(summary))
    .map(({ isDone: _isDone, ...action }) => action)
    .sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]);
}

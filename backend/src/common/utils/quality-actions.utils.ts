import type { QualitySummaryDto } from "src/applications/dto/get-application.dto";

/**
 * Catalogue des actions de mise en qualité (IQ) traçables pendant une campagne, miroir du
 * catalogue front `frontend/src/utils/quality-next-actions.ts` (mêmes clés, mêmes libellés) :
 * une action par champ de la Quality Tab (acteurs + conformités) susceptible d'être renseigné en
 * réponse à une relance de campagne.
 */
export interface QualityActionDefinition {
  key: string;
  label: string;
  isDone: (summary: QualitySummaryDto) => boolean;
}

export const QUALITY_ACTIONS: readonly QualityActionDefinition[] = [
  {
    key: "description",
    label: "Description renseignée",
    isDone: (s) => s.hasDescription,
  },
  {
    key: "hosting",
    label: "Hébergement renseigné",
    isDone: (s) => s.hasHosting,
  },
  {
    key: "moa",
    label: "Acteur MOA renseigné",
    isDone: (s) => s.actors.MOA,
  },
  {
    key: "moe",
    label: "Acteur MOE renseigné",
    isDone: (s) => s.actors.MOE,
  },
  {
    key: "tma",
    label: "Acteur TMA renseigné",
    isDone: (s) => s.actors.TMA,
  },
  {
    key: "heb",
    label: "Responsable de l'hébergement renseigné",
    isDone: (s) => s.actors.HEB,
  },
  {
    key: "rep",
    label: "Responsable d'exploitation renseigné",
    isDone: (s) => s.actors.REP,
  },
  {
    key: "pdma",
    label: "Conformité PDMA amorcée",
    isDone: (s) => s.compliances.PDMA,
  },
  {
    key: "dima",
    label: "Conformité DIMA amorcée",
    isDone: (s) => s.compliances.DIMA,
  },
  {
    key: "homologation",
    label: "Date de fin d'homologation renseignée",
    isDone: (s) => s.compliances.HOMOLOGATION,
  },
  {
    key: "snapvisu",
    label: "Lien de supervision Snapvisu ajouté",
    isDone: (s) => s.hasSnapvisu,
  },
];

export function getCompletedQualityActionKeys(
  summary: QualitySummaryDto,
): string[] {
  return QUALITY_ACTIONS.filter((action) => action.isDone(summary)).map(
    (action) => action.key,
  );
}

export function getQualityActionLabel(key: string): string {
  return QUALITY_ACTIONS.find((action) => action.key === key)?.label ?? key;
}

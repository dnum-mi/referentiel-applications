import { RelationType, Status, TechnologyEolSource } from "@prisma/client";
import { RelationTypeLabelsBidirectional } from "./relation-type-labels";

export const ReportStatusLabels: Record<string, string> = {
  in_pending: "En attente",
  in_progress: "En cours",
  done: "Terminée",
};

/// Libellés « direction source », dérivés de la source unique bidirectionnelle
/// (#2246) — plus de deuxième map à maintenir à la main.
export const RelationTypeLabels: Record<RelationType, string> =
  Object.fromEntries(
    Object.entries(RelationTypeLabelsBidirectional).map(([type, labels]) => [
      type,
      labels.source,
    ]),
  ) as Record<RelationType, string>;

export const PriorityRestartLabels: Record<string, string> = {
  R0: "R0 - Immédiat (H24)",
  R1: "R1 - Dès que le socle technique est rétabli (H24)",
  R1_STAR: "R1* - Selon période d'activité",
  R2: "R2 - Dès que possible (H24)",
  R3: "R3 - Quand le plus urgent est réalisé (H0)",
};

export const ExternalRessourceTypeLabels: Record<string, string> = {
  documentation: "Documentation",
  supervision: "Supervision",
  service: "Service externe",
  audience_metrics: "Métriques d’audience",
  main_service: "Service principal",
};

export const NatureLabels: Record<string, string> = {
  NON_DEFINIE: "Non définie",
  PHYSIQUE: "Physique",
  VIRTUEL: "Virtuel",
  CLOUD: "Cloud",
  BARRE_METAL: "Bare metal",
};

/// Wording aligné sur l'écran (frontend statusApplicationDictionary, #2246) :
/// exports et UI doivent afficher le même libellé pour un même statut.
export const ApplicationStatusLabels = {
  under_construction: "En construction",
  to_validate: "A valider",
  poc: "POC (Preuve de concept)",
  in_production_mvp: "MVP en production",
  in_production: "En production",
  in_production_decommissioning: "À décommissionner",
  decommissioned: "Décommissionnée",
  deleted: "Supprimée",
} satisfies Record<Status, string>;

/// Origine de la fin de vie d'une technologie (#2454), telle que restituée dans l'historique.
export const TechnologyEolSourceLabels = {
  endoflife: "calculée via endoflife.date",
  manual: "saisie manuelle",
} satisfies Record<TechnologyEolSource, string>;

export const ALL_ENUM_LABELS: Record<string, string> = {
  ...ReportStatusLabels,
  ...RelationTypeLabels,
  ...PriorityRestartLabels,
  ...ExternalRessourceTypeLabels,
  ...NatureLabels,
  ...ApplicationStatusLabels,
  ...TechnologyEolSourceLabels,
};

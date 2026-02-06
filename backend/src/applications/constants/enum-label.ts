export const AnomalyNotificationStatusLabels: Record<string, string> = {
  in_pending: "En attente",
  in_progress: "En cours",
  done: "Terminée",
};

export const RelationTypeLabels: Record<string, string> = {
  is_part_of: "Fait partie de",
  in_replacement_of: "En remplacement de",
  is_service_user_of: "Utilise le service de",
  is_data_user_of: "Utilise des données de",
};

export const PriorityRestartLabels: Record<string, string> = {
  R0: "R0 - Immédiat (H24)",
  R1: "R1 - Dès que le socle technique est rétabli (H24)",
  R1_STAR: "R1* - Selon période d'activité",
  R2: "R2 - Dès que possible (H24)",
  R3: "R3 - Quand le plus urgent est réalisé (H0)",
};

export const EventTypeLabels: Record<string, string> = {
  under_construction: "En construction",
  in_production: "En production",
  decommissioned: "Décommissionnée",
  decommissioning: "En décommissionnement",
  highlight: "Événement",
};

export const ExternalRessourceTypeLabels: Record<string, string> = {
  documentation: "Documentation",
  supervision: "Supervision",
  service: "Service externe",
  audience_metrics: "Métriques d’audience",
};

export const NatureLabels: Record<string, string> = {
  NON_DEFINIE: "Non définie",
  PHYSIQUE: "Physique",
  VIRTUEL: "Virtuel",
  CLOUD: "Cloud",
  BARRE_METAL: "Bare metal",
};

export const ApplicationStatusLabels: Record<string, string> = {
  under_construction: "En construction",
  to_validate: "A valider",
  poc: "POC",
  in_production_mvp: "En production (MVP)",
  in_production: "En production",
  in_production_decommissioning: "En décommissionnement",
  decommissioned: "Décommissionnée",
  deleted: "Supprimée",
};

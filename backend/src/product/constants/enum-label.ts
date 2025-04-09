export const AnomalyNotificationStatusLabels: Record<string, string> = {
  in_pending: 'En attente',
  in_progress: 'En cours',
  done: 'Terminée',
};

export const RelationTypeLabels: Record<string, string> = {
  is_part_of: 'Fait partie de',
  in_replacement_of: 'En remplacement de',
  is_service_user_of: 'Utilise le service de',
  is_data_user_of: 'Utilise des données de',
};

export const PriorityRestartLabels: Record<string, string> = {
  p0: 'P0 - Critique',
  p1: 'P1 - Très haute',
  p2: 'P2 - Haute',
  p3: 'P3 - Moyenne',
  p4: 'P4 - Faible',
  p5: 'P5 - Très faible',
};

export const ComplianceTypeLabels: Record<string, string> = {
  regulation: 'Réglementaire',
  standard: 'Standard',
  policy: 'Politique interne',
  contractual: 'Contractuelle',
  security: 'Sécurité',
  privacy: 'Vie privée',
};

export const ComplianceStatusLabels: Record<string, string> = {
  compliant: 'Conforme',
  non_compliant: 'Non conforme',
  partially_compliant: 'Partiellement conforme',
  not_concerned: 'Non concerné',
};

export const EventTypeLabels: Record<string, string> = {
  under_construction: 'En construction',
  in_production: 'En production',
  decommissioned: 'Décommissionnée',
  decommissioning: 'En décommissionnement',
  highlight: 'Événement',
};

export const ExternalRessourceTypeLabels: Record<string, string> = {
  documentation: 'Documentation',
  supervision: 'Supervision',
  service: 'Service externe',
  audience_metrics: 'Métriques d’audience',
};

export const NatureLabels: Record<string, string> = {
  NON_DEFINIE: 'Non définie',
  PHYSIQUE: 'Physique',
  VIRTUEL: 'Virtuel',
  CLOUD: 'Cloud',
  BARRE_METAL: 'Bare metal',
};

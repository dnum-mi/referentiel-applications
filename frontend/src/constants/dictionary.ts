import type {
  ApplicationPriorityRestart,
  ApplicationStatus,
  ApplicationType,
  CreateComplianceDto,
  RelationType,
} from "@/client/types.gen.js";

export const statusDictionary = {
  in_pending: "En attente",
  in_progress: "En cours",
  done: "Terminé",
} as const;

export const statusIconClasses = {
  in_pending: "ri-time-line",
  in_progress: "ri-loader-2-line",
  done: "ri-check-line",
} as const;

export const statusColors = {
  in_pending: "bg-warning",
  in_progress: "bg-info",
  done: "bg-success",
} as const;

export const actorTypeMapping: Record<string, string> = {
  MOA: "Maîtrise d’Ouvrage (MOA)",
  MOE: "Maîtrise d’Œuvre (MOE)",
  RSSI: "Responsable de la Sécurité des Systèmes d’Information (RSSI)",
  ArchitecteApplicatif: "Architecte applicatif",
  ArchitecteTechnique: "Architecte technique",
  TMA: "Tierce Maintenance Applicative (TMA)",
  Exploitation: "Responsable d'exploitation opérationnel",
  RSIMM: "Responsables des SI Métier et de la Modernisation (RSIMM)",
  CPD: "Correspondant à la protection des données (CPD)",
  OrganismeBeneficiaire: "Correspondant Stratégique Métier (CSM)",
  ProductOwner: "Product Owner (PO)",
  ProductManager: "Product Manager (PM)",
  Hebergement: "Responsable de l'hébergement",
  Autre: "Autre",
};

export const testResultsDict = {
  OK: "OK",
  KO: "KO",
};

export const backupStorageDict = {
  S3: "S3",
  LOCAL: "Local",
  EXTERNE: "Externe",
};

export const homologationStatusDict = {
  homologuee: "Homologuée",
  en_cours: "En cours d'homologation",
  dispensee: "Dispensée d'homologation",
  non_realisee: "Non réalisée",
  a_mettre_en_place: "À mettre en place",
} as const satisfies Record<NonNullable<CreateComplianceDto["homologation_status"]>, string>;

// Valeurs autorisées DIMA / PDMA (cf. ticket #1901), présentées du plus permissif au plus strict.
export const dimaDurationHoursOptions = [
  { value: 96, text: "96H" },
  { value: 72, text: "72H" },
  { value: 48, text: "48H" },
  { value: 24, text: "24H" },
  { value: 4, text: "4H" },
  { value: 1, text: "1H" },
  { value: 0, text: "0H" },
];

export const pdmaDurationHoursOptions = [
  { value: 48, text: "48H" },
  { value: 24, text: "24H" },
  { value: 2, text: "2H" },
  { value: 0, text: "0H" },
];

export const linkTypesDict = {
  documentation: "Documentation",
  supervision: "Supervision",
  service: "Service",
  audience_metrics: "Mesure d'audience",
  main_service: "Service principal",
};

export const restartPrioritiesConfig = {
  R0: {
    type: "error",
    label: "R0 – Immédiat (H24)",
    shortLabel: "R0",
    tooltip: "Le socle technique indispensable sans lequel les applications ne peuvent être relancées (travaux en H24)",
  },
  R1: {
    type: "warning",
    label: "R1 – Dès que le socle technique est rétabli (H24)",
    shortLabel: "R1",
    tooltip: "Les applications prioritaires supportant les missions",
  },
  R1_STAR: {
    type: "warning",
    label: "R1* – Selon période d'activité",
    shortLabel: "R1*",
    tooltip:
      "Equivalent à R1 si en activité, Equivalent à R3 si en sommeil - Les applications prioritaires supportant les missions régaliennes ayant des périodes d'utilisation d'activité durant lesquelles l'indisponibilité présente des conséquences opérationnelles majeures et de sommeil durant lesquelles l'indisponibilité ne présente aucune conséquence opérationnelle",
  },
  R2: {
    type: "info",
    label: "R2 – Dès que possible (H24)",
    shortLabel: "R2",
    tooltip: "Les applications opérationnelles dont l'indisponibilité présente des conséquences opérationnelles limitées (travaux en H24)",
  },
  R3: {
    type: "default",
    label: "R3 – Quand le plus urgent est réalisé (H0)",
    shortLabel: "R3",
    tooltip: "Les applications qui peuvent rester indisponibles sans conséquences opérationnelles (travaux en HO seulement)",
  },
} as const satisfies Record<ApplicationPriorityRestart, { type: string; label: string; shortLabel: string; tooltip: string }>;

// Wording aligné sur les exports backend (ApplicationStatusLabels, #2246) :
// un même statut doit s'afficher pareil à l'écran et dans les exports CSV/XLSX.
export const statusApplicationDictionary: Record<ApplicationStatus, string> = {
  under_construction: "En construction",
  to_validate: "A valider",
  poc: "POC (Preuve de concept)",
  in_production_mvp: "MVP en production",
  in_production: "En production",
  in_production_decommissioning: "À décommissionner",
  decommissioned: "Décommissionnée",
  deleted: "Supprimée",
};

// Liste exhaustive des statuts, dérivée du dictionnaire ci-dessus (lui-même
// contraint par l'enum généré) : un nouveau statut backend casse la compilation
// ici au lieu de disparaître silencieusement des filtres (#2246).
export const APPLICATION_STATUSES = Object.keys(statusApplicationDictionary) as ApplicationStatus[];

export const priorityRestartLabelsOptions = Object.entries(restartPrioritiesConfig).map(([key, value]) => ({
  value: key as ApplicationPriorityRestart,
  text: value.label,
}));

export const complianceFieldLabels: Record<string, string> = {
  duration_hours: "Durée (heures)",
  status: "Statut d'homologation",
  date_end: "Date de fin d'homologation",
  test_result: "Résultat du dernier test",
  last_test_date: "Date du dernier test",
  is_hno: "Heure non ouvrée",
  data_types: "Types de données",
  business_impact: "Impact métier",
  service_url: "URL du service",
  accessibility_url: "URL d'accessibilité",
  backup_frequency: "Fréquence de sauvegarde",
  backup_storage: "Stockage de sauvegarde",
  duration_months: "Durée (mois)",
  audit_date: "Date d'audit",
  score_percentage: "Score (%)",
  implemented: "DSFR implémenté",
  version: "Version DSFR",
  has_aipd: "AIPD réalisée",
  dpo_name: "Nom du DPO",
  recovery_plan: "Plan de reprise",
  recovery_solutions: "Solutions de reprise",
  recovery_manager: "Responsable de la reprise",
  backup_method: "Méthode de sauvegarde",
  restoration_manager: "Responsable de la restauration",
  score: "Score EcoIndex",
  ges: "Émissions GES (gCO2e)",
  water: "Consommation d'eau (cl)",
  target_url: "URL cible EcoIndex",
  eco_index_target_url: "URL cible EcoIndex",
  last_calculated_at: "Dernier calcul",
};

export const metadataActionLabels: Record<string, string> = {
  add: "Ajout",
  update: "Modification",
  delete: "Suppression",
};

export const relationTypeLabels: Record<RelationType, string> = {
  is_part_of: "fait partie de",
  in_replacement_of: "remplace",
  is_service_user_of: "utilise le service de",
  is_data_user_of: "utilise les données de",
  use_sso_of: "utilise le SSO de",
  is_correlated_with: "est corrélée à",
};
export type ComplianceType = "dima" | "pdma" | "homologation" | "rgaa" | "dsfr" | "rgpd" | "eco_index" | "pra";

/** Critères de conformité proposés dans le filtre du catalogue, dans l'ordre d'affichage. */
export const complianceFilterCriteria = ["pra", "dima", "pdma", "homologation", "rgaa", "dsfr", "rgpd"] as const;

export type ComplianceFilterCriterion = (typeof complianceFilterCriteria)[number];

/** Libellés courts pour le filtre conformité de la sidebar. */
export const complianceFilterLabels: Record<ComplianceFilterCriterion, string> = {
  pra: "PRA",
  dima: "DIMA",
  pdma: "PDMA",
  homologation: "Homologation",
  rgaa: "RGAA",
  dsfr: "DSFR",
  rgpd: "RGPD",
};

/** Descriptions affichées dans les info-bulles du filtre conformité de la sidebar. */
export const complianceFilterTooltips: Record<ComplianceFilterCriterion, string> = {
  pra: "Plan de Reprise d'Activité (PRA) : capacité à relancer le service après un sinistre majeur.",
  dima: "Délai d'Indisponibilité Maximale Admissible (DIMA) : durée maximale d'interruption tolérée avant impact critique.",
  pdma: "Perte de Données Maximale Admissible (PDMA) : volume de données pouvant être perdu sans impact critique.",
  homologation: "Homologation de sécurité du système d'information, attestant de la maîtrise des risques.",
  rgaa: "Référentiel Général d'Amélioration de l'Accessibilité (RGAA) : conformité aux normes d'accessibilité numérique.",
  dsfr: "Système de Design de l'État (DSFR) : utilisation du design system dans l'interface de l'application.",
  rgpd: "Règlement Général sur la Protection des Données (RGPD) : conformité en matière de protection des données personnelles.",
};

/**
 * Critères de conformité réellement booléens (oui / non / non renseigné).
 * Pour ceux-ci le filtre propose 4 états ; les autres se limitent à présent / absent.
 */
export const complianceBooleanCriteria: ComplianceFilterCriterion[] = ["pra", "dsfr"];

export const typeApplicationDictionary: Record<ApplicationType, string> = {
  business: "Métier",
  core_service: "Service socle",
  intranet_citizen: "Intranet citoyen",
  intranet_staff: "Intranet agent",
  data_hub: "Hub de données",
};

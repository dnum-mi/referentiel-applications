export const statusDictionary = {
  in_pending: "En attente",
  in_progress: "En cours",
  done: "Terminé",
};

export const statusIconClasses = {
  in_pending: "ri-time-line",
  in_progress: "ri-loader-2-line",
  done: "ri-check-line",
};

export const statusColors = {
  in_pending: "bg-warning",
  in_progress: "bg-info",
  done: "bg-success",
};

export const actorTypeMapping: Record<string, string> = {
  MOA: "Maîtrise d’Ouvrage (MOA)",
  MOE: "Maîtrise d’Œuvre (MOE)",
  RSSI: "Responsable de la Sécurité des Systèmes d’Information (RSSI)",
  ArchitecteApplicatif: "Architecte applicatif",
  ArchitecteTechnique: "Architecte technique",
  TMA: "Tierce Maintenance Applicative (TMA)",
  Exploitation: "Responsable d'exploitation opérationel",
  RSIMM: "Responsables des SI Métier et de la Modernisation (RSIMM)",
  CPD: "Correspondant à la protection des données (CPD)",
  OrganismeBeneficiaire: "Correspondant Stratégique Métier (CSM)",
  ProductOwner: "Product Owner (PO)",
  ProductManager: "Product Manager (PM)",
  Hebergement: "Responsable de l'hébergement",
  Autre: "Autre",
};

export const complianceTypesDict = {
  regulation: "Réglementation",
  standard: "Standard",
  policy: "Politique",
  contractual: "Contractuel",
  security: "Sécurité",
  privacy: "Confidentialité",
};
export const complianceStatusesDict = {
  compliant: "Conforme",
  non_compliant: "Non conforme",
  partially_compliant: "Partiellement conforme",
  not_concerned: "Non concerné",
};

export const linkTypesDict = {
  documentation: "Documentation",
  supervision: "Supervision",
  service: "Service",
  audience_metrics: "Mesure d'audience",
};

export const eventTypesArray = [
  { value: "under_construction", text: "En construction" },
  { value: "in_production", text: "En production" },
  { value: "decommissioned", text: "Décommissionée" },
  { value: "decommissioning", text: "En décommissionnement" },
  { value: "highlight", text: "Événement" },
];

export const eventTypesDict = Object.fromEntries(eventTypesArray.map(({ value, text }) => [value, text]));

export const priorityConfig = new Map<string, { type: string; label: string; tooltip: string }>([
  ["p0", { type: "error", label: "P0 – Critique", tooltip: "Service vital – doit redémarrer en priorité absolue" }],
  ["p1", { type: "warning", label: "P1 – Haute", tooltip: "Important – redémarrage rapide nécessaire" }],
  ["p2", { type: "info", label: "P2 – Moyenne", tooltip: "Peut attendre une reprise partielle" }],
  ["p3", { type: "default", label: "P3 – Normale", tooltip: "Pas de contrainte forte de redémarrage" }],
  ["p4", { type: "none", label: "P4 – Faible", tooltip: "Faible priorité – redémarrage après les autres" }],
  ["p5", { type: "none", label: "P5 – Très faible", tooltip: "Dernier à redémarrer – peu critique" }],
]);

export const getPriorityBadgeType = (priority?: string) =>
  priorityConfig.get(priority ?? "") ?? {
    type: "none",
    label: "Non définie",
    tooltip: "Aucune priorité n’a été définie pour cette application",
  };

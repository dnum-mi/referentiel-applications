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
  Responsable: "Responsable",
  Exploitation: "Exploitation",
  ResponsableAutre: "Autre responsable",
  Hebergement: "Hébergement",
  ArchitecteApplicatif: "Architecte Applicatif",
  ArchitecteInfra: "Architecte Infra",
  RepresentantSSI: "Représentant SSI",
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
};

export const eventTypesArray = [
  { value: "under_construction", text: "En construction" },
  { value: "in_production", text: "En production" },
  { value: "decommissioned", text: "Déclassé" },
  { value: "decommissioning", text: "Déclassement" },
  { value: "highlight", text: "Événement" },
];

// Génération automatique du dictionnaire
export const eventTypesDict = Object.fromEntries(eventTypesArray.map(({ value, text }) => [value, text]));

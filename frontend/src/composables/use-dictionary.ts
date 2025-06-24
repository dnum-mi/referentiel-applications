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
};

export const applicationFieldsDict = {
  id: "Identifiant de l’application",
  label: "Libellé de l’application",
  shortName: "Nom court",
  logo: "Logo",
  description: "Description",
  tags: "Tags",
  purposes: "Finalités",
  targetPopulations: "Populations ciblées",
  priorityRestart: "Priorité de redémarrage",

  relationsAsSource: "Relations sortantes",
  "relationsAsSource.targetApplication.label": "Cibles liées (nom)",
  relationsAsTarget: "Relations entrantes",
  "relationsAsTarget.sourceApplication.label": "Sources liées (nom)",

  labels: "Labels",
  "labels.value": "Valeur du label",
  "labels.source": "Source du label",
  "labels.shortname": "Nom court du label",

  hostings: "Hébergements",
  "hostings.provider": "Fournisseur d’hébergement",
  "hostings.label": "Label d’hébergement",
  "hostings.region": "Région",
  "hostings.site": "Site",
  "hostings.nature": "Nature",
  "hostings.platform": "Plateforme",

  compliances: "Conformités",
  "compliances.type": "Type de conformité",
  "compliances.name": "Nom de la conformité",
  "compliances.status": "Statut",
  "compliances.validityStart": "Début de validité",
  "compliances.validityEnd": "Fin de validité",
  "compliances.scoreValue": "Score",
  "compliances.scoreUnit": "Unité du score",
  "compliances.notes": "Notes",

  actors: "Acteurs",
  "actors.firstname": "Prénom de l’acteur",
  "actors.lastname": "Nom de l’acteur",
  "actors.role": "Rôle",
  "actors.type": "Type",
  "actors.email": "Email",
  "actors.organization.sigle": "Organisation",

  events: "Événements",
  "events.type": "Type d’événement",
  "events.start": "Début",
  "events.end": "Fin",
  "events.description": "Description",

  externalRessource: "Ressources externes",
  "externalRessource.link": "Lien",
  "externalRessource.description": "Description ressource",
  "externalRessource.type": "Type de ressource",

  anomalyNotification: "Notifications d’anomalie",
  "anomalyNotification.description": "Description",
  "anomalyNotification.status": "Statut de notification",
};

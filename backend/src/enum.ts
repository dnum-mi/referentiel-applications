// enums.ts
export enum ComplianceType {
  REGULATION = 'regulation',
  STANDARD = 'standard',
  POLICY = 'policy',
  CONTRACTUAL = 'contractual',
  SECURITY = 'security',
  PRIVACY = 'privacy',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_CONCERNED = 'not_concerned',
}

export enum AnomalyNotificationStatus {
  PENDING = 'in_pending',
  INPROGRESS = 'in_progress',
  DONE = 'done',
}

export enum ExternalRessourceType {
  DOCUMENTATION = 'documentation',
  SUPERVISION = 'supervision',
  SERVICE = 'service',
}

export enum ActorType {
  RESPONSABLE = 'Responsable',
  EXPLOITATION = 'Exploitation',
  RESPONSABLE_AUTRE = 'ResponsableAutre',
  HEBERGEMENT = 'Hebergement',
  ARCHITECTE_APPLICATIF = 'ArchitecteApplicatif',
  ARCHITECTE_INFRA = 'ArchitecteInfra',
  REPRESENTANT_SSI = 'RepresentantSSI',
  AUTRE = 'Autre',
}

export enum RelationType {
  is_part_of,
  in_replacement_of,
  is_service_user_of,
  is_data_user_of,
}

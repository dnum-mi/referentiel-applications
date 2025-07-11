// enums.ts
export enum TestResult {
  OK = 'OK',
  KO = 'KO',
}

export enum BackupStorage {
  S3 = 'S3',
  LOCAL = 'LOCAL',
  EXTERNE = 'EXTERNE',
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
  AUDIENCE_METRICS = "Mesure d'audience",
}

export enum RelationType {
  is_part_of,
  in_replacement_of,
  is_service_user_of,
  is_data_user_of,
}

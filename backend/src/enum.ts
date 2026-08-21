// enums.ts
export enum TestResult {
  OK = "OK",
  KO = "KO",
}

export enum BackupStorage {
  S3 = "S3",
  LOCAL = "LOCAL",
  EXTERNE = "EXTERNE",
}

export enum HomologationStatus {
  HOMOLOGUEE = "homologuee",
  EN_COURS = "en_cours",
  DISPENSEE = "dispensee",
  NON_REALISEE = "non_realisee",
  A_METTRE_EN_PLACE = "a_mettre_en_place",
}

export enum ReportStatus {
  PENDING = "in_pending",
  INPROGRESS = "in_progress",
  DONE = "done",
}

export enum ExternalRessourceType {
  DOCUMENTATION = "documentation",
  SUPERVISION = "supervision",
  SERVICE = "service",
  AUDIENCE_METRICS = "Mesure d'audience",
  MAIN_SERVICE = "Service principal",
}

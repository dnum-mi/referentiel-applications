import type { Actor } from "./Actor";

export interface Application {
  id: string
  label: string
  shortName?: string
  labels?: Label[]
  status?: string // New field for application status
  description?: string
  targetPopulations?: string[]
  priorityRestart?: string
  organisationCode?: string
  quality?: number

  purposes?: string[]
  tags?: string[]
  ownerId?: string

  actors?: Actor[]
  compliances?: Compliance[]
  externalRessource?: ExternalRessource[]
  relationsAsSource?: Relation[]
  relationsAsTarget?: Relation[]
  metadatas: Metadata[]
}

export type ApplicationWithPerms = Application & { myPerms: Set<APP_PERMISSIONS> };

export interface Label {
  id?: string
  source?: string
  value: string
  metadataId?: string
  applicationId?: string
}

export interface Metadata {
  id?: string
  applicationId?: string
  createdAt: string
  createdBy?: string
  description?: string
  action?: string
}

export interface FirstAndLastMetadata {
  first: Metadata | null
  last: Metadata | null
}

export interface Compliance {
  id: string
  type: "DIMA" | "PDMA" | "HOMOLOGATION" | "RGAA" | "DSFR" | "RGPD"
  applicationId?: string

  // DIMA specific fields
  dima_duration_hours?: number
  dima_is_hno?: boolean
  dima_business_impact?: string
  dima_recovery_plan?: boolean
  dima_recovery_solutions?: string
  dima_last_test_date?: string
  dima_test_result?: "OK" | "KO"
  dima_recovery_manager?: string

  // PDMA specific fields
  pdma_duration_hours?: number
  pdma_data_types?: string
  pdma_backup_frequency?: string
  pdma_backup_method?: string
  pdma_backup_storage?: "S3" | "LOCAL" | "EXTERNE"
  pdma_last_test_date?: string
  pdma_test_result?: "OK" | "KO"
  pdma_restoration_manager?: string

  // Homologation specific fields
  homologation_date?: string
  homologation_duration_months?: number
  homologation_rssi_id?: string

  // RGAA specific fields
  rgaa_audit_date?: string
  rgaa_service_url?: string
  rgaa_accessibility_url?: string
  rgaa_score_percentage?: number

  // DSFR specific fields
  dsfr_implemented?: boolean
  dsfr_version?: string

  // RGPD specific fields
  rgpd_has_aipd?: boolean
  rgpd_dpo_name?: string
}
export interface ExternalRessource {
  id: string
  link: string
  description: string
  type: string
}
export interface Event {
  id: string
  start: string
  end: string
  type: string
  description: string
  metadataId?: string
}
export interface Relation {
  id: string
  type: string

  applicationSourceId: string
  applicationTargetId: string

  sourceApplication?: Application
  targetApplication?: Application
}
export interface User {
  keycloakId: string
  email: string
  organizationId?: string | null
  permissions?: string
}

// refer directly to columns in database
export type APP_PERMISSIONS =
  | "readBase"
  | "writeBase"
  | "readActors"
  | "writeActors"
  | "readCompliances"
  | "writeCompliances"
  | "readHostings"
  | "writeHostings"
  | "readMetadata"
  | "writeMetadata"
  | "readRelations"
  | "writeRelations"
  | "readLinks"
  | "writeLinks";
export type ApplicationRights = APP_PERMISSIONS[];

export type AppPermsMatrix = ({
  [x in APP_PERMISSIONS]: boolean;
} & {
  actorTypeId: string
})[];

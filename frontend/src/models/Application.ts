import type { ApplicationDto, ApplicationStatus, AppPermsDto, RelationType, LinkDto, LabelDto, MetadataDto, ComplianceDto } from "@/client/types.gen";
import type { Actor } from "./Actor";

// TODO sortir ce modèle et utiliser ApplicationDto
export interface Application {
  id: string
  label: string
  shortName?: string
  labels?: LabelDto[]
  status: ApplicationStatus // New field for application status
  description?: string
  targetPopulations?: string[]
  priorityRestart?: string
  organisationCode?: string
  quality?: number

  purposes?: string[]
  tags?: string[]
  ownerId?: string

  actors?: Actor[]
  compliances?: ComplianceDto[]
  externalRessource?: LinkDto[]
  relationsAsSource?: Relation[]
  relationsAsTarget?: Relation[]
  metadatas: MetadataDto[]
}

export type ApplicationWithPerms = ApplicationDto & { myPerms: Set<APP_PERMISSIONS> };

export interface Relation {
  id: string
  type: RelationType

  applicationSourceId: string
  applicationTargetId: string

  sourceApplication?: Application
  targetApplication?: Application
}

// refer directly to columns in database
export type APP_PERMISSIONS
  = keyof Exclude<AppPermsDto, "actorTypeId">;

import type {
  ActorDto,
  ApplicationDto,
  AppPermsDto,
  ComplianceDto,
  CreateApplicationDto,
  LabelDto,
  LinkDto,
  MetadataDto,
  RelationType,
} from "@/client/types.gen";

// TODO sortir ce modèle et utiliser ApplicationDto
export interface Application {
  id: string;
  label: string;
  shortName?: string;
  labels?: LabelDto[];
  description?: string;
  targetPopulations?: string[];
  priorityRestart?: string;
  organisationCode?: string;
  quality?: number;

  purposes?: string[];
  tags?: string[];

  actors?: ActorDto[];
  compliances?: ComplianceDto[];
  externalRessource?: LinkDto[];
  relationsAsSource?: Relation[];
  relationsAsTarget?: Relation[];
  metadatas: MetadataDto[];
}

export type CreateApplicationWithPerms = CreateApplicationDto & { myPerms: Set<APP_PERMISSIONS> };
export type ApplicationWithPerms = ApplicationDto & { myPerms: Set<APP_PERMISSIONS> };

export interface Relation {
  id: string;
  type: RelationType;

  applicationSourceId: string;
  applicationTargetId: string;

  sourceApplication?: Application;
  targetApplication?: Application;
}

// refer directly to columns in database
export type APP_PERMISSIONS = keyof Exclude<AppPermsDto, "actorTypeId">;

import type {
  ActorDto,
  ApplicationDto,
  AppPermsDto,
  ComplianceDto,
  CreateApplicationDto,
  LabelDto,
  LinkDto,
  MetadataDto,
  RelationDto,
  RelationType,
} from "@/client/types.gen";

export type Application = ApplicationDto & {
  labels?: LabelDto[];
  organisationCode?: string;
  tags?: string[];
  actors?: ActorDto[];
  compliances?: ComplianceDto[];
  externalRessource?: LinkDto[];
  relationsAsSource?: Relation[];
  relationsAsTarget?: Relation[];
  metadatas?: MetadataDto[];
};

export type CreateApplicationWithPerms = CreateApplicationDto & { myPerms: Set<APP_PERMISSIONS> };
export type ApplicationWithPerms = ApplicationDto & { myPerms: Set<APP_PERMISSIONS> };

export type Relation = RelationDto & {
  type: RelationType;
  sourceApplication?: Application;
  targetApplication?: Application;
};

// refer directly to columns in database
export type APP_PERMISSIONS = Exclude<keyof AppPermsDto, "actorTypeId">;

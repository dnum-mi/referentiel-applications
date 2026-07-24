import type {
  ActorDto,
  ApplicationDto,
  ApplicationPriorityRestart,
  ApplicationStatus,
  ApplicationStatusDto,
  ApplicationType,
  AppPermsDto,
  BusinessDivisionDto,
  ComplianceDto,
  CreateApplicationDto,
  CreateApplicationStatusDto,
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
  type?: ApplicationType;
  views?: number;
  actors?: ActorDto[];
  compliances?: ComplianceDto[];
  externalRessource?: LinkDto[];
  relationsAsSource?: Relation[];
  relationsAsTarget?: Relation[];
  metadatas?: MetadataDto[];
};

export type CreateApplicationWithPerms = CreateApplicationDto & { myPerms: Set<APP_PERMISSIONS> };
// Application complète (DTO + relations chargées par l'API) avec les permissions de l'utilisateur.
export type ApplicationWithPerms = Application & { myPerms: Set<APP_PERMISSIONS> };

// Données de préremplissage du formulaire d'application, communes aux modes
// création (CreateApplicationDto, statut objet) et édition (ApplicationDto, statut chaîne).
export type ApplicationFormInitialData = {
  id?: string;
  label?: string;
  shortName?: string | null;
  description?: string;
  logo?: string | null;
  status?: CreateApplicationStatusDto | ApplicationStatus;
  purposes?: string[];
  targetPopulations?: string[];
  priorityRestart?: ApplicationPriorityRestart;
  type?: ApplicationType;
  tags?: string[];
  businessDivisions?: BusinessDivisionDto[];
  currentStatus?: ApplicationStatusDto | null;
  quality?: number | null;
  myPerms?: Set<APP_PERMISSIONS>;
};

export type Relation = RelationDto & {
  type: RelationType;
  sourceApplication?: Application;
  targetApplication?: Application;
};

// refer directly to columns in database
export type APP_PERMISSIONS = Exclude<keyof AppPermsDto, "actorTypeId">;

export interface Application {
  id: string;
  label: string;
  shortName?: string;
  description?: string;
  organisationCode?: string;
  createdAt: string;
  updatedAt: string;

  purposes?: string[];
  tags?: string[];
  ownerId?: string;
  metadataId?: string;

  actors?: Actor[];
  compliances?: Compliance[];
  externals?: External[];
  externalRessource?: ExternalRessource[];
  relationsAsSource?: Relation[];
  relationsAsTarget?: Relation[];
}

export interface Actor {
  id?: string;
  role?: string;
  email: string;
  actorType: string;
  userId?: string;
  organizationId?: string | null;
  applicationId?: string;
  user?: User;
  externalOrganization?: External;
}
export interface Compliance {
  id: string;
  type: string;
  name: string;
  status: string;
  validityStart?: string;
  validityEnd?: string;
  scoreValue?: string;
  scoreUnit?: string;
  notes?: string;
  metadataId?: string;
  applicationId?: string;
}
export interface External {
  id: string;
  externalSourceId: string;
  value: string;
  label: string;
  shortName?: string;
  lastSourceUpdate?: string;
  metadataId?: string;
  applicationId?: string;
  externalSource?: ExternalSource;
}
export interface ExternalSource {
  id: string;
  type: string;
  uri?: string;
  valueType?: string;
  metadataId?: string;
}
export interface ExternalRessource {
  id: string;
  link: string;
  description: string;
  type: string;
}
export interface Event {
  id: string;
  start: string;
  end: string;
  type: string;
  description: string;
  metadataId?: string;
}
export interface Relation {
  id: string;
  type: string;

  applicationSource: string;
  applicationTarget: string;

  sourceApplication?: Application;
  targetApplication?: Application;
}
export interface User {
  keycloakId: string;
  email: string;
  organizationId?: string | null;
}

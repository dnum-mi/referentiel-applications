export interface Application {
  id: string;
  label: string;
  shortName?: string;
  description?: string;
  targetPopulations?: string[];
  organisationCode?: string;
  createdAt: string;
  updatedAt: string;

  purposes?: string[];
  tags?: string[];
  ownerId?: string;
  metadataId?: string;

  actors?: Actor[];
  compliances?: Compliance[];
  externalRessource?: ExternalRessource[];
  relationsAsSource?: Relation[];
  relationsAsTarget?: Relation[];
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

export type SbomComponentContext = "inventory" | "provenance" | "excluded";

export interface SbomComponent {
  context: SbomComponentContext;
  ref: string;
  product: string;
  version: string | null;
  purl: string | null;
  ecosystem: string | null;
  type: string;
  technology: string;
  identificationStatus: "identified" | "incomplete";
}

export interface SbomRelation {
  from: string;
  to: string;
  type: string;
  resolved: boolean;
}

export interface ParsedSbom {
  format: string;
  specVersion: string;
  projectVersion: string | null;
  components: SbomComponent[];
  relations: SbomRelation[];
  warnings: string[];
  fingerprint: string;
}

export interface SbomLimits {
  maxBytes: number;
  maxComponents: number;
  maxRelations: number;
}

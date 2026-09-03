import type { TechnologyEolSource } from "@prisma/client";

export class TechnologyStack {
  id: string;
  applicationId: string;
  technology: string;
  product: string;
  version?: string;
  docUrl?: string;
  eolDate?: Date;
  eolCheckedAt?: Date;
  eolProduct?: string;
  eoasDate?: Date;
  latestVersion?: string;
  eolCycle?: string;
  /// Origine de la fin de vie (#2454) : `manual` = saisie à la main, jamais recalculée.
  eolSource: TechnologyEolSource;
}

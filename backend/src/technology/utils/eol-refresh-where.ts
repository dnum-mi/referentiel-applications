import { TechnologyEolSource } from "@prisma/client";
import type { TechnologyStack } from "@prisma/client";

type EolSnapshot = Pick<
  TechnologyStack,
  | "id"
  | "applicationId"
  | "product"
  | "version"
  | "eolCheckedAt"
  | "eolProduct"
  | "eolCycle"
  | "eolDate"
  | "eoasDate"
  | "latestVersion"
>;

/**
 * Le résultat réseau ne vaut que pour les entrées et l'état lus avant l'appel.
 * Le compare-and-swap protège aussi une résolution concurrente du même produit
 * et de la même version, sans ajouter de colonne de révision.
 */
export function eolRefreshWhere(snapshot: EolSnapshot) {
  return {
    id: snapshot.id,
    applicationId: snapshot.applicationId,
    product: snapshot.product,
    version: snapshot.version,
    eolSource: TechnologyEolSource.endoflife,
    eolCheckedAt: snapshot.eolCheckedAt,
    eolProduct: snapshot.eolProduct,
    eolCycle: snapshot.eolCycle,
    eolDate: snapshot.eolDate,
    eoasDate: snapshot.eoasDate,
    latestVersion: snapshot.latestVersion,
  };
}

import { Prisma } from "@prisma/client";

/**
 * #2370 — Une organisation est DANS le périmètre `scope` si son path est le scope lui-même,
 * ou un de ses descendants à une frontière de segment (`scope + "/"`).
 *
 * Deux formes fautives ont coexisté dans le code :
 * - un `contains` (sous-chaîne) : un scope `/SG` couvrait `/MI/DNUM/SG`, `/SGAMI` ou
 *   `/AUTRE/SG-BIS` ;
 * - un `startsWith` NU : un scope `/SG` couvrait encore `/SGAMI`.
 *
 * Seul l'ancrage au séparateur est correct. Source unique de la règle, pour que les
 * emplacements qui filtrent par périmètre ne divergent plus. Insensible à la casse.
 */
export function organizationWithinScope(
  scope: string,
): Prisma.OrganizationWhereInput {
  return {
    OR: [
      { path: { equals: scope, mode: "insensitive" } },
      { path: { startsWith: `${scope}/`, mode: "insensitive" } },
    ],
  };
}

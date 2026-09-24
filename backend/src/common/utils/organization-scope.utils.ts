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
 * Les séparateurs finaux sont ignorés : un scope déjà terminé par `/` ne doit pas
 * produire un préfixe `//`, qui exclurait tous ses descendants.
 */
export function organizationWithinScope(
  scope: string,
): Prisma.OrganizationWhereInput {
  const normalizedScope = scope.replace(/\/+$/, "");
  if (!normalizedScope) return { id: { in: [] } };

  return {
    OR: [
      { path: { equals: normalizedScope, mode: "insensitive" } },
      { path: { startsWith: `${normalizedScope}/`, mode: "insensitive" } },
    ],
  };
}

/**
 * Même règle que `organizationWithinScope`, appliquée à un path déjà chargé (contrôle unitaire
 * d'un objet, plutôt que filtrage d'une requête Prisma).
 *
 * Un path absent n'est dans le périmètre d'AUCUN administrateur scopé (#2371) : un objet sans
 * organisation ne doit pas devenir modifiable par un administrateur de périmètre.
 */
export function isPathWithinScope(
  targetPath: string | null | undefined,
  scope: string,
): boolean {
  if (!targetPath) return false;
  const normalizedTarget = targetPath.replace(/\/+$/, "").toLowerCase();
  const normalizedScope = scope.replace(/\/+$/, "").toLowerCase();
  if (!normalizedScope) return false;
  return (
    normalizedTarget === normalizedScope ||
    normalizedTarget.startsWith(`${normalizedScope}/`)
  );
}

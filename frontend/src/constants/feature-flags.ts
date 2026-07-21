/**
 * Clés des feature flags — SOURCE UNIQUE : le catalogue backend
 * (`backend/src/feature-flag/feature-flag.keys.ts`) est propagé au contrat
 * OpenAPI (`FeatureFlagDto.key`, enum `FeatureFlagKey`) puis au client généré.
 * Ce module ne fait que ré-exporter l'objet généré : il n'y a AUCUN miroir
 * manuel à maintenir côté front.
 *
 * Import relatif (et non `@/client`) : le fichier est aussi consommé par le
 * package e2e (garde anti-dérive de FLG-01), qui ne résout pas l'alias `@`.
 */
// Ré-exporte à la fois la constante et le type homonyme.
export { FeatureFlagKey } from "../client/types.gen";

import type { JWTPayload } from "jose";
import { AuthLevel, Roles } from "@prisma/client";
import type { AuthLevelConfig } from "src/config/configs/auth-level.config";
import type { UserEntity } from "src/user/entities/user.entity";

/**
 * Pourquoi la session a reçu ce niveau (#1985) :
 * - `disabled` : mode `off`, rien n'a été évalué ;
 * - `trusted-idp` : pas de claim de mode, fournisseur fédéré listé dans AUTH_LEVEL_TRUSTED_IDPS ;
 * - `strong-method` : le claim de mode porte une valeur forte ;
 * - `weak-method` : le claim est présent mais sa valeur n'est pas forte ;
 * - `untrusted-idp` : pas de claim de mode, fournisseur présent mais non listé ;
 * - `claim-missing` : ni mode ni fournisseur dans le jeton.
 */
export const AUTH_LEVEL_REASONS = [
  "disabled",
  "trusted-idp",
  "strong-method",
  "weak-method",
  "untrusted-idp",
  "claim-missing",
] as const;
export type AuthLevelReason = (typeof AUTH_LEVEL_REASONS)[number];

export interface AuthLevelEvaluation {
  level: AuthLevel;
  reason: AuthLevelReason;
  /** Valeur(s) brute(s) du claim de mode, telles que transmises, pour la phase d'observation. */
  claimValue?: string;
  /** Valeur brute du claim de fournisseur d'identité, si transmise. */
  idp?: string;
}

/**
 * Lit un claim comme une liste de chaînes : `amr` est un tableau, `Auth-Mode` une chaîne. Tout
 * autre type est traité comme absent — un claim qu'on ne sait pas lire ne vaut jamais preuve.
 */
function readClaim(payload: JWTPayload, name: string | undefined): string[] {
  if (!name) return [];
  const raw = payload[name];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

const normalize = (value: string) => value.toLowerCase();

export function evaluateAuthLevel(
  payload: JWTPayload,
  config: AuthLevelConfig,
): AuthLevelEvaluation {
  if (config.mode === "off") {
    return { level: AuthLevel.unknown, reason: "disabled" };
  }

  const idp = readClaim(payload, config.idpClaim)[0];
  const methods = readClaim(payload, config.claim);
  const claimValue = methods.length > 0 ? methods.join(",") : undefined;

  // Un claim de mode explicite prime toujours : la liste des fournisseurs de confiance ne
  // comble que son ABSENCE (les fournisseurs fédérés ne transmettent pas de mode). Un mode
  // faible transmis par un fournisseur listé reste faible — jamais de fail-open par la liste.
  if (
    methods.some((method) => config.strongValues.includes(normalize(method)))
  ) {
    return {
      level: AuthLevel.strong,
      reason: "strong-method",
      claimValue,
      idp,
    };
  }
  if (methods.length > 0) {
    return { level: AuthLevel.weak, reason: "weak-method", claimValue, idp };
  }
  if (idp !== undefined && config.trustedIdps.includes(normalize(idp))) {
    return { level: AuthLevel.strong, reason: "trusted-idp", idp };
  }
  if (idp !== undefined) {
    return { level: AuthLevel.unknown, reason: "untrusted-idp", idp };
  }
  return { level: AuthLevel.unknown, reason: "claim-missing" };
}

/** Faible ET inconnu sont rétrogradés : un claim absent vaut « faible », sans exception. */
export function isDowngraded(
  evaluation: AuthLevelEvaluation,
  config: AuthLevelConfig,
): boolean {
  return config.mode === "enforce" && evaluation.level !== AuthLevel.strong;
}

/**
 * Utilisateur « standard » (#1985) : rôle VISITOR, aucune permission individuelle, aucun
 * périmètre. Les QUATRE champs sont nécessaires — `role` est lu directement par
 * l'impersonation, `assertIsAdministrator`, la projection de rôle par application et la
 * création de jeton personnel, puis recalculé en permissions par `UserPermissionsInterceptor`
 * sur `/users/me` ; la RELATION `scopeOrganization` (pas seulement l'id) est lue par tout le
 * code de périmètre. E-mail et organisation sont conservés : la couche 3 (acteurs) reste
 * résolue, puis ramenée aux lectures dans `resolveAppPermissions`.
 *
 * Réécriture en mémoire uniquement : rien n'est jamais persisté.
 */
export function stepDownPrincipal<T extends UserEntity>(user: T): T {
  return {
    ...user,
    role: Roles.VISITOR,
    additionalPermissions: [],
    scopeOrganizationId: null,
    scopeOrganization: null,
  };
}

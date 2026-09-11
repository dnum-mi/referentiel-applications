import { Logger } from "@nestjs/common";
import { registerAs } from "@nestjs/config";

const logger = new Logger("AuthLevelConfig");

export const AUTH_LEVEL_MODES = ["off", "observe", "enforce"] as const;
export type AuthLevelMode = (typeof AUTH_LEVEL_MODES)[number];

export const AUTH_LEVEL_REAUTH_STRATEGIES = ["prompt", "logout"] as const;
export type AuthLevelReauthStrategy =
  (typeof AUTH_LEVEL_REAUTH_STRATEGIES)[number];

export interface AuthLevelReauthConfig {
  /** Propose une reconnexion forte depuis le front (bouton du bandeau). */
  enabled: boolean;
  /**
   * `prompt` : redirection vers le fournisseur avec `prompt` (défaut) ; `logout` : déconnexion
   * complète de la session SSO puis nouvelle connexion, pour un fournisseur qui ignorerait
   * `prompt=login`. Le front bascule de lui-même sur `logout` si la première tentative échoue.
   */
  strategy: AuthLevelReauthStrategy;
  /** Paramètre `prompt` envoyé à `/authorize` (défaut `login`). */
  prompt: string;
  /** `acr_values` optionnel, si le fournisseur d'identité sait exiger un niveau. */
  acrValues?: string;
  /** `max_age` optionnel, en secondes. */
  maxAge?: number;
}

export interface AuthLevelUserinfoConfig {
  /** Lit les claims manquants sur l'endpoint userinfo du fournisseur (AUTH_LEVEL_USERINFO_FALLBACK). */
  enabled: boolean;
  /** URL explicite (AUTH_LEVEL_USERINFO_URL) ; à défaut, lue dans le document de découverte. */
  url?: string;
  /** Délai maximal d'un appel userinfo (AUTH_LEVEL_USERINFO_TIMEOUT_MS, défaut 2000). */
  timeoutMs: number;
}

export interface AuthLevelConfig {
  mode: AuthLevelMode;
  /** Nom du claim de mode d'authentification sur l'access token (ex. `auth_mode`). */
  claim?: string;
  /** Valeurs du claim valant authentification forte, normalisées en minuscules. */
  strongValues: string[];
  /** Nom du claim identifiant le fournisseur d'identité d'origine (ex. `auth_idp`). */
  idpClaim?: string;
  /** Fournisseurs fédérés dont l'identification vaut authentification forte (minuscules). */
  trustedIdps: string[];
  reauth: AuthLevelReauthConfig;
  userinfo: AuthLevelUserinfoConfig;
  /** Page d'aide (utiliser sa carte agent, activer la double authentification). */
  helpUrl?: string;
}

function isAuthLevelMode(value: string): value is AuthLevelMode {
  return (AUTH_LEVEL_MODES as readonly string[]).includes(value);
}

function parseMode(raw: string | undefined): AuthLevelMode {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "") return "off";
  if (!isAuthLevelMode(value)) {
    throw new Error(
      `AUTH_LEVEL_MODE="${raw}" invalide : valeurs acceptées off, observe, enforce`,
    );
  }
  return value;
}

/** Liste CSV normalisée : espaces retirés, minuscules, entrées vides ignorées. */
export function parseCsvList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function parseOptionalString(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

function parseNonNegativeInt(
  raw: string | undefined,
  name: string,
  unit: string,
): number | undefined {
  const value = parseOptionalString(raw);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    logger.warn(
      `${name}="${raw}" ignoré : un entier positif (${unit}) est attendu.`,
    );
    return undefined;
  }
  return parsed;
}

/** Délai d'un appel userinfo : entre 1 ms et 60 s, 2000 ms par défaut ou si invalide. */
function parseUserinfoTimeout(raw: string | undefined): number {
  const value = parseOptionalString(raw);
  if (value === undefined) return 2000;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60_000) {
    logger.warn(
      `AUTH_LEVEL_USERINFO_TIMEOUT_MS="${raw}" ignoré : un entier entre 1 et 60000 (millisecondes) est attendu. Valeur retenue : 2000.`,
    );
    return 2000;
  }
  return parsed;
}

function parseStrategy(raw: string | undefined): AuthLevelReauthStrategy {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "") return "prompt";
  if ((AUTH_LEVEL_REAUTH_STRATEGIES as readonly string[]).includes(value)) {
    return value as AuthLevelReauthStrategy;
  }
  logger.warn(
    `AUTH_LEVEL_REAUTH_STRATEGY="${raw}" ignoré : valeurs acceptées prompt, logout. Valeur retenue : prompt.`,
  );
  return "prompt";
}

/**
 * Niveau d'authentification de la session SSO (#1985) : carte agent ou double authentification
 * donnent les droits pleins, tout autre mode ramène la session aux droits d'un utilisateur
 * standard.
 *
 * - `mode` (AUTH_LEVEL_MODE) : `off` (défaut, aucune évaluation), `observe` (évaluation
 *   journalisée et exposée sur `/users/me`, droits intacts — l'étape de mesure obligatoire avant
 *   toute activation) ou `enforce` (rétrogradation appliquée).
 * - `claim` / `strongValues` (AUTH_LEVEL_CLAIM / AUTH_LEVEL_STRONG_VALUES) : obligatoires dès que
 *   le mode n'est pas `off`. Aucune valeur n'est codée en dur : le nom du claim et ses valeurs
 *   sont déclarés côté fournisseur d'identité et vivent dans la configuration d'infra.
 * - `idpClaim` / `trustedIdps` (AUTH_LEVEL_IDP_CLAIM / AUTH_LEVEL_TRUSTED_IDPS) : délégation de
 *   confiance explicite aux fournisseurs fédérés qui ne transmettent pas de mode. Liste vide
 *   par défaut ; ne jamais y lister le fournisseur principal, cela neutraliserait la fonction.
 * - `userinfo` (AUTH_LEVEL_USERINFO_*) : si le claim de mode manque sur l'access token, il est lu
 *   sur l'endpoint userinfo du fournisseur (désactivé par défaut) — le référentiel fonctionne
 *   ainsi que le fournisseur place ses attributs sur le jeton ou seulement dans userinfo.
 *
 * Un claim absent vaut toujours « faible » : il n'existe volontairement aucune variable qui le
 * ferait valoir « fort ». Un environnement dont le fournisseur n'émet pas le claim reste en `off`.
 *
 * Fail-fast : un mode actif sans claim ni valeurs fortes rétrograderait tout le monde, il ne
 * doit pas démarrer.
 */
export const authLevelConfig = registerAs("authLevel", (): AuthLevelConfig => {
  const mode = parseMode(process.env.AUTH_LEVEL_MODE);
  const claim = parseOptionalString(process.env.AUTH_LEVEL_CLAIM);
  const strongValues = parseCsvList(process.env.AUTH_LEVEL_STRONG_VALUES);
  const idpClaim = parseOptionalString(process.env.AUTH_LEVEL_IDP_CLAIM);
  const trustedIdps = parseCsvList(process.env.AUTH_LEVEL_TRUSTED_IDPS);
  const reauth: AuthLevelReauthConfig = {
    enabled: process.env.AUTH_LEVEL_REAUTH_ENABLED !== "false",
    prompt:
      parseOptionalString(process.env.AUTH_LEVEL_REAUTH_PROMPT) ?? "login",
    acrValues: parseOptionalString(process.env.AUTH_LEVEL_REAUTH_ACR_VALUES),
    maxAge: parseNonNegativeInt(
      process.env.AUTH_LEVEL_REAUTH_MAX_AGE,
      "AUTH_LEVEL_REAUTH_MAX_AGE",
      "secondes",
    ),
    strategy: parseStrategy(process.env.AUTH_LEVEL_REAUTH_STRATEGY),
  };
  const userinfo: AuthLevelUserinfoConfig = {
    enabled: process.env.AUTH_LEVEL_USERINFO_FALLBACK === "true",
    url: parseOptionalString(process.env.AUTH_LEVEL_USERINFO_URL),
    timeoutMs: parseUserinfoTimeout(process.env.AUTH_LEVEL_USERINFO_TIMEOUT_MS),
  };
  const helpUrl = parseOptionalString(process.env.AUTH_LEVEL_HELP_URL);

  if (mode !== "off") {
    if (!claim) {
      throw new Error(
        `AUTH_LEVEL_CLAIM est requis quand AUTH_LEVEL_MODE=${mode}`,
      );
    }
    if (strongValues.length === 0) {
      throw new Error(
        `AUTH_LEVEL_STRONG_VALUES est requis quand AUTH_LEVEL_MODE=${mode}`,
      );
    }
    if (process.env.DISABLE_JWT_VALIDATION) {
      logger.warn(
        "DISABLE_JWT_VALIDATION est actif : le claim de niveau d'authentification est lu sans vérification de signature (développement uniquement).",
      );
    }
    // Premier réflexe de diagnostic pour l'exploitant : aucun secret ici.
    logger.log(
      `mode=${mode} claim=${claim} strongValues=[${strongValues.join(",")}] idpClaim=${idpClaim ?? "-"} trustedIdps=[${trustedIdps.join(",")}] reauth=${reauth.enabled ? `${reauth.strategy}:${reauth.prompt}` : "off"} userinfo=${userinfo.enabled ? (userinfo.url ?? "découverte") : "off"}`,
    );
  }

  return {
    mode,
    claim,
    strongValues,
    idpClaim,
    trustedIdps,
    reauth,
    userinfo,
    helpUrl,
  };
});

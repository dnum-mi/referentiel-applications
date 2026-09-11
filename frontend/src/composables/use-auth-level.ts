import { readonly, ref } from "vue";
import type { AuthLevelDto, AuthLevelReason } from "@/client/types.gen";

// #1985 — Niveau d'authentification de la session (carte agent / double authentification).
// Le backend est la seule source de vérité : le front n'affiche que ce que `/users/me` a décidé
// (`authLevel.downgraded`) et ne lit jamais les claims du jeton lui-même.

export const STEP_DOWN_REASONS = ["impersonation", "personal-token", "admin-action"] as const;
export type StepDownReason = (typeof STEP_DOWN_REASONS)[number];

/** Payload des 403 propres au niveau d'authentification, calqué sur le refus `blocked`. */
export interface StepDownResponse {
  statusCode?: number;
  stepDown: true;
  reason: StepDownReason;
  message?: string;
}

export function isStepDownResponse(value: unknown): value is StepDownResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "stepDown" in value &&
    value.stepDown === true &&
    "reason" in value &&
    typeof value.reason === "string" &&
    (STEP_DOWN_REASONS as readonly string[]).includes(value.reason)
  );
}

export const STEP_DOWN_MESSAGES: Record<StepDownReason, string> = {
  impersonation: "L'impersonation a été interrompue : elle nécessite une authentification forte (carte agent ou double authentification).",
  "personal-token": "La création d'un jeton personnel nécessite une authentification forte (carte agent ou double authentification).",
  "admin-action": "Cette action nécessite une authentification forte (carte agent ou double authentification).",
};

/** Message du 403 générique quand la session est rétrogradée (onglets ou boutons restés en cache). */
export const WEAK_AUTH_PERMISSION_MESSAGE =
  "Permission refusée. Vous êtes connecté sans authentification forte : cette action peut nécessiter une reconnexion avec votre carte agent ou la double authentification (voir le bandeau en haut de page).";

export const REAUTH_SUCCESS_MESSAGE = "Authentification forte confirmée : vos droits complets sont rétablis.";
export const REAUTH_REDIRECT_FAILED_MESSAGE = "La redirection vers le fournisseur d'identité a échoué. Réessayez.";

// Le sessionStorage peut être indisponible (navigation privée verrouillée, iframe) : on perd alors
// seulement un message de confirmation, jamais un droit.
function readAndClear(key: string): string | null {
  try {
    const value = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // voir ci-dessus
  }
}

/**
 * Stratégie de reconnexion forte : `prompt` redirige vers le fournisseur en exigeant une nouvelle
 * authentification ; `logout` ferme d'abord complètement la session SSO, pour un fournisseur qui
 * ignorerait `prompt=login`. Le bandeau passe de lui-même à `logout` après un échec de `prompt`.
 */
export type ReauthStrategy = "prompt" | "logout";

// Drapeau de tentative de reconnexion forte : posé juste avant la redirection, consommé au retour
// pour distinguer un succès (toast) d'une boucle (le fournisseur a renvoyé la même session). Il
// porte la stratégie employée, pour que le bandeau propose l'étape suivante.
const REAUTH_ATTEMPT_KEY = "strongReauthAttempt";

export function markReauthAttempt(strategy: ReauthStrategy): void {
  write(REAUTH_ATTEMPT_KEY, strategy);
}

export function consumeReauthAttempt(): ReauthStrategy | undefined {
  const value = readAndClear(REAUTH_ATTEMPT_KEY);
  if (value === "prompt" || value === "logout") return value;
  return value === "1" ? "prompt" : undefined; // valeur posée par une version précédente
}

// Reconnexion par déconnexion : la page revient de la déconnexion du fournisseur sans session ; ce
// drapeau horodaté (valable dix minutes) relance aussitôt la connexion forte.
const LOGOUT_REAUTH_KEY = "strongReauthAfterLogout";
const LOGOUT_REAUTH_VALIDITY_MS = 10 * 60_000;

export function markLogoutReauthPending(now = Date.now()): void {
  write(LOGOUT_REAUTH_KEY, String(now));
}

export function consumeLogoutReauthPending(now = Date.now()): boolean {
  const markedAt = Number(readAndClear(LOGOUT_REAUTH_KEY));
  return Number.isFinite(markedAt) && markedAt > 0 && now - markedAt < LOGOUT_REAUTH_VALIDITY_MS;
}

// Avis à afficher après un rechargement forcé (impersonation refusée → purge + reload) : sans
// lui, l'agent verrait sa session d'impersonation disparaître sans aucune explication.
const STEP_DOWN_NOTICE_KEY = "stepDownNotice";

export function markStepDownNotice(reason: StepDownReason): void {
  write(STEP_DOWN_NOTICE_KEY, reason);
}

export function consumeStepDownNotice(): StepDownReason | undefined {
  const value = readAndClear(STEP_DOWN_NOTICE_KEY);
  return value && (STEP_DOWN_REASONS as readonly string[]).includes(value) ? (value as StepDownReason) : undefined;
}

// Conservée dans le sessionStorage de l'onglet : un rechargement (F5, mise à jour automatique de
// l'application, rechargement après une impersonation refusée) ne doit pas ramener le bandeau à la
// voie qui vient d'échouer. Effacée dès qu'une session forte est constatée.
const REAUTH_LOOP_KEY = "strongReauthLoop";

function readStoredLoop(): ReauthStrategy | null {
  try {
    const value = sessionStorage.getItem(REAUTH_LOOP_KEY);
    return value === "prompt" || value === "logout" ? value : null;
  } catch {
    return null;
  }
}

const reauthLoop = ref<ReauthStrategy | null>(readStoredLoop());
/**
 * Stratégie de la dernière reconnexion forte restée sans effet (la session est toujours
 * rétrogradée), `null` sinon. Le bandeau en déduit son texte et l'étape suivante.
 */
export const reauthLoopState = readonly(reauthLoop);

export function setReauthLoop(strategy: ReauthStrategy | null): void {
  reauthLoop.value = strategy;
  try {
    if (strategy) sessionStorage.setItem(REAUTH_LOOP_KEY, strategy);
    else sessionStorage.removeItem(REAUTH_LOOP_KEY);
  } catch {
    // sessionStorage indisponible : la bascule ne vaut que jusqu'au prochain rechargement.
  }
}

export interface WeakAuthBannerText {
  title: string;
  description: string;
  /** Le motif autorise une tentative de reconnexion ; la configuration peut la désactiver. */
  canReauth: boolean;
}

const STANDARD_RIGHTS = "Vos droits sont limités à ceux d'un utilisateur standard pour cette session.";

/** Texte du bandeau selon le motif renvoyé par le backend, et variante « boucle » après une reconnexion. */
export function weakAuthBannerText(reason: AuthLevelReason, loop: ReauthStrategy | null = null): WeakAuthBannerText {
  if (loop === "prompt") {
    return {
      title: "Votre reconnexion n'a pas été reconnue comme forte",
      description: `${STANDARD_RIGHTS} Le bouton ci-dessous ferme complètement votre session avant de vous reconnecter : présentez alors votre carte agent ou la double authentification.`,
      canReauth: true,
    };
  }
  if (loop === "logout") {
    return {
      title: "Votre session est toujours sans authentification forte",
      description: `${STANDARD_RIGHTS} Même après une déconnexion complète, le fournisseur d'identité n'a pas transmis d'authentification forte : vérifiez que vous utilisez votre carte agent ou la double authentification ; si le problème persiste, contactez le support.`,
      canReauth: true,
    };
  }
  switch (reason) {
    case "claim-missing":
    case "untrusted-idp":
      return {
        title: "Mode d'authentification non transmis par le fournisseur d'identité",
        description: `${STANDARD_RIGHTS} Reconnectez-vous avec votre carte agent ou la double authentification ; si le problème persiste, contactez le support.`,
        canReauth: true,
      };
    default:
      return {
        title: "Connexion sans carte agent ni double authentification",
        description: `${STANDARD_RIGHTS} Reconnectez-vous avec votre carte agent ou la double authentification pour retrouver vos droits.`,
        canReauth: true,
      };
  }
}

const LEVEL_WORDING: Record<AuthLevelDto["level"], string> = { strong: "forte", weak: "faible", unknown: "inconnue" };

/**
 * Ligne « Niveau d'authentification » du profil. Même table de motifs que le bandeau pour une
 * session rétrogradée ; en mode observation (`downgraded` faux, niveau évalué), la ligne permet
 * aux testeurs de confronter ce qu'ils ont fait (carte agent) à ce que le référentiel a reçu.
 */
export function profileAuthLevelText(authLevel: AuthLevelDto | undefined): string | undefined {
  if (!authLevel) return undefined;
  if (authLevel.downgraded) {
    switch (authLevel.reason) {
      case "claim-missing":
      case "untrusted-idp":
        return "Mode d'authentification non transmis par le fournisseur d'identité : droits d'utilisateur standard";
      default:
        return "Session sans carte agent ni double authentification : droits d'utilisateur standard";
    }
  }
  if (authLevel.level === "strong") return "Forte (carte agent ou double authentification)";
  const detail =
    authLevel.reason === "claim-missing"
      ? "non transmis par le fournisseur d'identité"
      : `niveau évalué : ${LEVEL_WORDING[authLevel.level]}`;
  return `Mode observation, sans effet sur vos droits (${detail})`;
}

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

// Drapeau de tentative de reconnexion forte : posé juste avant la redirection, consommé au retour
// pour distinguer un succès (toast) d'une boucle (le fournisseur a renvoyé la même session).
const REAUTH_ATTEMPT_KEY = "strongReauthAttempt";

export function markReauthAttempt(): void {
  write(REAUTH_ATTEMPT_KEY, "1");
}

export function consumeReauthAttempt(): boolean {
  return readAndClear(REAUTH_ATTEMPT_KEY) === "1";
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

const reauthLoopDetected = ref(false);
/** Vrai quand une reconnexion forte vient d'être tentée et que la session reste rétrogradée. */
export const reauthLoopState = readonly(reauthLoopDetected);

export function setReauthLoopDetected(detected: boolean): void {
  reauthLoopDetected.value = detected;
}

export interface WeakAuthBannerText {
  title: string;
  description: string;
  /** Faux quand une reconnexion ne changerait rien (fournisseur externe sans mode). */
  canReauth: boolean;
}

const STANDARD_RIGHTS = "Vos droits sont limités à ceux d'un utilisateur standard pour cette session.";

/** Texte du bandeau selon le motif renvoyé par le backend, et variante « boucle » après une reconnexion. */
export function weakAuthBannerText(reason: AuthLevelReason, loopDetected = false): WeakAuthBannerText {
  if (loopDetected) {
    return {
      title: "Votre reconnexion n'a pas été reconnue comme forte",
      description: `${STANDARD_RIGHTS} Utilisez votre carte agent ou activez la double authentification sur votre compte, puis reconnectez-vous.`,
      canReauth: true,
    };
  }
  switch (reason) {
    case "claim-missing":
      return {
        title: "Mode d'authentification non transmis par le fournisseur d'identité",
        description: `${STANDARD_RIGHTS} Si vous vous êtes connecté avec votre carte agent, reconnectez-vous ; si le problème persiste, contactez le support.`,
        canReauth: true,
      };
    case "untrusted-idp":
      return {
        title: "Connexion via un fournisseur d'identité externe",
        description: `Ce fournisseur ne transmet pas votre mode d'authentification : ${STANDARD_RIGHTS.charAt(0).toLowerCase()}${STANDARD_RIGHTS.slice(1)}`,
        canReauth: false,
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
        return "Mode d'authentification non transmis par le fournisseur d'identité : droits d'utilisateur standard";
      case "untrusted-idp":
        return "Fournisseur d'identité externe, mode non transmis : droits d'utilisateur standard (une reconnexion ne changerait rien)";
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

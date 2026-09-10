import { ForbiddenException, HttpStatus } from "@nestjs/common";

export const STEP_DOWN_REASONS = [
  "impersonation",
  "personal-token",
  "admin-action",
] as const;
export type StepDownReason = (typeof STEP_DOWN_REASONS)[number];

export interface StepDownBody {
  statusCode: HttpStatus.FORBIDDEN;
  stepDown: true;
  reason: StepDownReason;
  message: string;
}

export const STEP_DOWN_MESSAGES: Record<StepDownReason, string> = {
  impersonation:
    "L'impersonation nécessite une authentification forte (carte agent ou double authentification).",
  "personal-token":
    "La création d'un jeton personnel nécessite une authentification forte (carte agent ou double authentification).",
  "admin-action":
    "Cette action nécessite une authentification forte (carte agent ou double authentification).",
};

export function stepDownBody(reason: StepDownReason): StepDownBody {
  return {
    statusCode: HttpStatus.FORBIDDEN,
    stepDown: true,
    reason,
    message: STEP_DOWN_MESSAGES[reason],
  };
}

/**
 * Refus lié au niveau d'authentification (#1985). Toujours un 403 à payload typé, calqué sur le
 * refus `blocked` du middleware : un 401 déclencherait côté front la boucle `signinSilent` →
 * `signinRedirect`, qui reproduirait la même session au même niveau. Le front reconnaît
 * `stepDown: true` pour afficher un message dédié (et purger l'impersonation persistée).
 */
export class StepDownException extends ForbiddenException {
  constructor(public readonly reason: StepDownReason) {
    super(stepDownBody(reason));
  }
}

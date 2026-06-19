// Gestion de l'état d'impersonation côté client.
//
// L'impersonation est pilotée par un header HTTP envoyé sur chaque requête. On
// persiste l'identifiant de la cible (et quelques infos d'affichage) dans le
// localStorage afin que la session survive à un rechargement de page.

export const IMPERSONATE_HEADER = "x-impersonate-user-id";

const USER_ID_KEY = "impersonatedUserId";
const USER_EMAIL_KEY = "impersonatedUserEmail";
const ADMIN_EMAIL_KEY = "impersonatorEmail";

export interface ImpersonationState {
  userId: string;
  userEmail: string;
  adminEmail: string;
}

export function getImpersonatedUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function getImpersonationState(): ImpersonationState | null {
  const userId = localStorage.getItem(USER_ID_KEY);
  const userEmail = localStorage.getItem(USER_EMAIL_KEY);
  const adminEmail = localStorage.getItem(ADMIN_EMAIL_KEY);
  if (!userId || !userEmail || !adminEmail) return null;
  return { userId, userEmail, adminEmail };
}

export function setImpersonationState(state: ImpersonationState): void {
  localStorage.setItem(USER_ID_KEY, state.userId);
  localStorage.setItem(USER_EMAIL_KEY, state.userEmail);
  localStorage.setItem(ADMIN_EMAIL_KEY, state.adminEmail);
}

export function clearImpersonationState(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(ADMIN_EMAIL_KEY);
}

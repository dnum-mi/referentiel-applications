import { useRegisterSW } from "virtual:pwa-register/vue";
import { onScopeDispose } from "vue";

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Recherche périodique d'une nouvelle version. Son activation reste une action
 * explicite pour ne pas interrompre la lecture ou une saisie en cours.
 */
export function useAppUpdate() {
  let interval: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  const registrationState = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration || disposed) return;
      if (interval) clearInterval(interval);
      interval = setInterval(() => checkForUpdate(swUrl, registration), UPDATE_CHECK_INTERVAL_MS);
    },
  });
  onScopeDispose(() => {
    disposed = true;
    if (interval) clearInterval(interval);
  });
  return registrationState;
}

export async function checkForUpdate(swUrl: string, registration: ServiceWorkerRegistration) {
  // Une installation est déjà en cours, ou le poste est hors-ligne : inutile d'insister.
  if (registration.installing || !navigator.onLine) return;

  // Vérifie que le serveur répond bien avant d'appeler registration.update(),
  // pour ne pas laisser le navigateur logger des erreurs quand le réseau est indisponible.
  const response = await fetch(swUrl, { cache: "no-store", headers: { "cache-control": "no-cache" } }).catch(() => undefined);
  if (response?.status === 200) {
    await registration.update().catch(() => undefined);
  }
}

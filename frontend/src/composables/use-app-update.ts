import { useRegisterSW } from "virtual:pwa-register/vue";

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Détection des nouvelles versions de l'application (#2149).
 *
 * Le service worker (mode "prompt", cf. vite.config.ts) détecte une nouvelle
 * version au chargement de la page, mais un onglet de SPA peut rester ouvert
 * des jours : on force donc une vérification périodique. Quand une nouvelle
 * version est installée, `needRefresh` passe à true et ReloadPrompt propose
 * de recharger — plus besoin de hard refresh.
 */
export function useAppUpdate() {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      setInterval(() => checkForUpdate(swUrl, registration), UPDATE_CHECK_INTERVAL_MS);
    },
  });

  function closePrompt() {
    offlineReady.value = false;
    needRefresh.value = false;
  }

  return { offlineReady, needRefresh, updateServiceWorker, closePrompt };
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

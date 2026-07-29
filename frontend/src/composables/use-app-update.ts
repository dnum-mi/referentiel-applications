import { useRegisterSW } from "virtual:pwa-register/vue";

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Mise à jour automatique de l'application (#2149).
 *
 * Le service worker est en mode "autoUpdate" (cf. vite.config.ts) : dès qu'une
 * nouvelle version est activée, vite-plugin-pwa recharge la page — l'utilisateur
 * n'a rien à faire. Le navigateur ne vérifiant le service worker qu'au
 * chargement de la page, on force en plus une vérification périodique pour les
 * onglets de SPA restant ouverts longtemps.
 */
export function useAppUpdate() {
  useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      setInterval(() => checkForUpdate(swUrl, registration), UPDATE_CHECK_INTERVAL_MS);
    },
  });
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

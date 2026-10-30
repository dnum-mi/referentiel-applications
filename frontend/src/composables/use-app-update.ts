import { useRegisterSW } from "virtual:pwa-register/vue";
import { onScopeDispose } from "vue";

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const UPDATE_ACTIVATION_TIMEOUT_MS = 30_000;

/**
 * Recherche périodique d'une nouvelle version. Son activation reste une action
 * explicite pour ne pas interrompre la lecture ou une saisie en cours.
 */
export function useAppUpdate() {
  let interval: ReturnType<typeof setInterval> | undefined;
  let registration: ServiceWorkerRegistration | undefined;
  let cancelActivation: (() => void) | undefined;
  let disposed = false;
  let reloadRequested = false;
  let reloading = false;

  function reloadOnce() {
    if (!reloadRequested || reloading || disposed) return;
    reloading = true;
    window.location.reload();
  }

  const registrationState = useRegisterSW({
    // Une activation dans un autre onglet ne doit pas interrompre une saisie.
    onNeedReload: reloadOnce,
    onRegisteredSW(swUrl, registered) {
      if (!registered || disposed) return;
      registration = registered;
      if (interval) clearInterval(interval);
      interval = setInterval(() => checkForUpdate(swUrl, registered), UPDATE_CHECK_INTERVAL_MS);
    },
  });

  async function updateServiceWorker(reloadPage = true) {
    if (disposed) return;
    if (!reloadPage) return registrationState.updateServiceWorker(false);

    reloadRequested = true;
    try {
      const waiting = registration?.waiting;
      if (waiting) {
        // La promesse du plugin confirme seulement l'envoi de SKIP_WAITING.
        // Attendre l'activation évite de recharger l'ancienne version en cache.
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            waiting.removeEventListener("statechange", onStateChange);
            cancelActivation = undefined;
            if (error) reject(error);
            else resolve();
          };
          const onStateChange = () => {
            if (waiting.state === "activated") finish();
            else if (waiting.state === "redundant") finish(new Error("Service worker activation failed"));
          };
          const timeout = setTimeout(() => finish(new Error("Service worker activation timed out")), UPDATE_ACTIVATION_TIMEOUT_MS);
          cancelActivation = () => finish(new Error("Service worker activation cancelled"));
          waiting.addEventListener("statechange", onStateChange);
          onStateChange();
          if (!settled) {
            void registrationState.updateServiceWorker(true).catch((error: unknown) => {
              finish(error instanceof Error ? error : new Error("Service worker update failed", { cause: error }));
            });
          }
        });
      } else {
        // Déjà actif (notamment après une première visite non contrôlée) :
        // SKIP_WAITING ne fait plus rien ; le clic doit quand même recharger la page.
        await registrationState.updateServiceWorker(true);
      }
      reloadOnce();
    } finally {
      reloadRequested = false;
    }
  }

  onScopeDispose(() => {
    disposed = true;
    if (interval) clearInterval(interval);
    cancelActivation?.();
  });
  return { ...registrationState, updateServiceWorker };
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

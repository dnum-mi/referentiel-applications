const RELOAD_TIMESTAMP_KEY = "rda:stale-chunk-reload-at";
const RELOAD_LOOP_WINDOW_MS = 10_000;

/**
 * Après un déploiement, les chunks JS/CSS hashés de l'ancienne version n'existent
 * plus sur le serveur : les imports dynamiques (routes lazy) échouent alors tant
 * que l'utilisateur n'a pas rechargé la page (#2149). Dans ce cas on recharge
 * automatiquement pour récupérer le nouvel index.html, avec un garde-fou
 * sessionStorage pour ne pas boucler si l'erreur persiste après rechargement.
 */
export function reloadOnStaleChunk(targetUrl?: string): boolean {
  const lastReloadAt = Number(sessionStorage.getItem(RELOAD_TIMESTAMP_KEY) ?? 0);
  if (Date.now() - lastReloadAt < RELOAD_LOOP_WINDOW_MS) return false;

  sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now()));
  if (targetUrl) {
    window.location.assign(targetUrl);
  } else {
    window.location.reload();
  }
  return true;
}

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
    message,
  );
}

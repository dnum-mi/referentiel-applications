// #2306 — filet de sécurité côté service worker pour le rechargement automatique.
//
// Le rechargement sur mise à jour (#2149) repose sur le runtime embarqué dans la
// page (vite-plugin-pwa recharge sur l'événement « activated »). Les pages
// chargées avec une version antérieure à v1.86 n'ont pas ce runtime : le nouveau
// service worker s'active bien chez elles (skipWaiting + clientsClaim), mais
// rien ne recharge la page affichée — l'utilisateur reste sur l'ancienne UI
// jusqu'à un refresh manuel.
//
// Ce script, importé par le sw.js généré (workbox.importScripts, cf.
// vite.config.ts), recharge depuis le service worker les fenêtres qui ne se
// sont pas rechargées d'elles-mêmes peu après l'activation : les pages modernes
// se rechargent immédiatement (leur client disparaît au profit d'un nouveau),
// seules les pages à l'ancien runtime sont donc encore là au bout du délai.

const LEGACY_RELOAD_DELAY_MS = 4000;

// Vrai seulement quand ce service worker en remplace un autre : à la première
// installation il n'y a rien à recharger (et on ne veut surtout pas recharger
// la page d'un nouveau visiteur 4 s après son arrivée).
let isUpdate = false;

self.addEventListener("install", () => {
  isUpdate = !!self.registration.active;
});

self.addEventListener("activate", () => {
  if (!isUpdate) return;

  // Volontairement PAS dans event.waitUntil : la navigation forcée passe par le
  // fetch handler du service worker, qui n'est servi qu'une fois l'activation
  // terminée — attendre ces navigations dans waitUntil interbloquerait
  // l'activation (page figée en pleine navigation, vécu en test). Retarder
  // l'activation repousserait aussi l'événement « activated » sur lequel les
  // pages modernes déclenchent leur propre rechargement.
  (async () => {
    const before = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const beforeIds = new Set(before.map((client) => client.id));

    await new Promise((resolve) => setTimeout(resolve, LEGACY_RELOAD_DELAY_MS));

    const after = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(
      after.filter((client) => beforeIds.has(client.id)).map((client) => client.navigate(client.url).catch(() => undefined)),
    );
  })();
});

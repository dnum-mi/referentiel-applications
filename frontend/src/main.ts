import { VIcon } from "@gouvminint/vue-dsfr";
import Aura from "@primevue/themes/aura";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import VueMatomo from "vue-matomo";
import { vUseMermaid } from "@/composables/use-mermaid";
import App from "./App.vue";

import router from "./router/index";
import { logDsfrVersion } from "./utils/log-dsfr-version";
import { reloadOnStaleChunk } from "./utils/stale-chunk";
import "@gouvfr/dsfr/dist/core/core.main.min.css";
import "@gouvfr/dsfr/dist/component/component.main.min.css";
import "@gouvfr/dsfr/dist/utility/utility.main.min.css";
import "@gouvminint/vue-dsfr/styles";
import "@gouvfr/dsfr/dist/scheme/scheme.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons.min.css";
import "./main.css";

logDsfrVersion();

// Chunk hashé introuvable après un déploiement : on recharge au lieu de laisser
// l'application casser silencieusement (#2149).
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnStaleChunk()) {
    event.preventDefault();
  }
});

const app = createApp(App);

const isProd = import.meta.env.MODE === "production";

const MATOMO_URL = isProd
  ? (import.meta.env.VITE_MATOMO_URL ?? "VITE_RDA_MATOMO_URL")
  : import.meta.env.VITE_MATOMO_URL || import.meta.env.VITE_RDA_MATOMO_URL;

const MATOMO_SITE_ID = isProd
  ? Number(import.meta.env.VITE_MATOMO_SITE_ID ?? "VITE_RDA_MATOMO_SITE_ID")
  : Number(import.meta.env.VITE_MATOMO_SITE_ID || import.meta.env.VITE_RDA_MATOMO_SITE_ID);

app.use(createPinia());
app.use(router);

// N'active Matomo que s'il est réellement configuré : en production, ou en
// développement quand on l'a explicitement demandé via VITE_ENABLE_MATOMO.
// Évite l'erreur réseau « matomo.js ERR_CONNECTION_REFUSED » quand le service
// Matomo local (docker-compose.matomo.yml) n'est pas démarré.
const matomoEnabled = Boolean(MATOMO_URL) && Number.isFinite(MATOMO_SITE_ID) && (isProd || import.meta.env.VITE_ENABLE_MATOMO === "true");

if (matomoEnabled) {
  app.use(VueMatomo, {
    host: MATOMO_URL,
    siteId: MATOMO_SITE_ID,
    router,
    enableLinkTracking: true,
    enableHeartBeatTimer: true,
  });
}
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

app.component("VIcon", VIcon);
app.directive("use-mermaid", vUseMermaid);

app.mount("#app");

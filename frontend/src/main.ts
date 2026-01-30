import { VIcon } from "@gouvminint/vue-dsfr";
import Aura from "@primevue/themes/aura";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import { vUseMermaid } from "@/composables/use-mermaid";
import App from "./App.vue";
import MatomoPlugin from "./plugins/MatomoPlugin";

import router from "./router/index";
import { logDsfrVersion } from "./utils/log-dsfr-version";
import "@gouvfr/dsfr/dist/core/core.main.min.css";
import "@gouvfr/dsfr/dist/component/component.main.min.css";
import "@gouvfr/dsfr/dist/utility/utility.main.min.css";
import "@gouvminint/vue-dsfr/styles";
import "@gouvfr/dsfr/dist/scheme/scheme.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons.min.css";
import "./main.css";

logDsfrVersion();

const app = createApp(App);

const isProd = import.meta.env.MODE === "production";

const MATOMO_URL = isProd
  ? (import.meta.env.VITE_MATOMO_URL ?? "VITE_RDA_MATOMO_URL")
  : import.meta.env.VITE_MATOMO_URL || import.meta.env.VITE_RDA_MATOMO_URL;

const MATOMO_SITE_ID = isProd
  ? Number(import.meta.env.VITE_MATOMO_SITE_ID ?? "VITE_RDA_MATOMO_SITE_ID")
  : Number(import.meta.env.VITE_MATOMO_SITE_ID || import.meta.env.VITE_RDA_MATOMO_SITE_ID);

app.use(MatomoPlugin, {
  host: MATOMO_URL,
  siteId: MATOMO_SITE_ID,
  router,
  debug: import.meta.env.DEBUG === "true",
  enableHeartBeatTimer: true,
});

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
});

app.component("VIcon", VIcon);
app.directive("use-mermaid", vUseMermaid);

app.mount("#app");

router.afterEach((to) => {
  console.log("trackPageView", to.fullPath);
  app.config.globalProperties.$matomo?.trackPageView(to.fullPath);
});

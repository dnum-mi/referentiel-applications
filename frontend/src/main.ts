import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router/index";
import { VIcon } from "@gouvminint/vue-dsfr";

// Importation des styles DSFR et personnalisés
import "@gouvfr/dsfr/dist/core/core.main.min.css";
import "@gouvfr/dsfr/dist/component/component.main.min.css";
import "@gouvfr/dsfr/dist/utility/utility.main.min.css";
import "@gouvminint/vue-dsfr/styles";
import "@gouvfr/dsfr/dist/scheme/scheme.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons.min.css";
import "./main.css";
import MatomoPlugin from "./plugins/MatomoPlugin";

const app = createApp(App);

app.use(MatomoPlugin, {
  host: import.meta.env.VITE_MATOMO_URL,
  siteId: Number(import.meta.env.VITE_MATOMO_SITE_ID),
  router,
  debug: import.meta.env.DEBUG === "true",
  enableHeartBeatTimer: true,
});

app.use(createPinia());
app.use(router);
app.component("VIcon", VIcon);

app.mount("#app");

router.afterEach((to) => {
  console.log("trackPageView", to.fullPath);
  app.config.globalProperties.$matomo?.trackPageView(to.fullPath);
});

import { createApp, h } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import PrimeVue from "primevue/config";
import { Permission } from "../../../src/client";
import { client } from "../../../src/client/client.gen";
import type { ApplicationWithPerms } from "../../../src/models/Application";
import RelationshipsTab from "../../../src/components/RelationshipsTab.vue";
import "@gouvfr/dsfr/dist/core/core.main.min.css";
import "@gouvfr/dsfr/dist/component/component.main.min.css";
import "@gouvfr/dsfr/dist/utility/utility.main.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons.main.min.css";
import "@gouvminint/vue-dsfr/styles";

client.setConfig({ baseUrl: location.origin });
const readOnly = new URLSearchParams(location.search).has("readOnly");
const application = {
  id: "root",
  label: "Application de démonstration",
  logo: null,
  shortName: null,
  description: "Fiche fictive de recette des relations",
  purposes: [],
  targetPopulations: [],
  quality: null,
  myPerms: new Set(readOnly ? [Permission.RELATION_READ] : [Permission.RELATION_READ, Permission.RELATION_WRITE]),
} satisfies ApplicationWithPerms;
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ name: "application", path: "/applications/:id", component: { template: "<p>Fiche de démonstration</p>" } }],
});
await router.push("/applications/root");
await router.isReady();
createApp({
  render: () =>
    h("main", { class: "fr-p-3w" }, [
      h("h1", { class: "fr-h4" }, application.label),
      h("h2", { class: "fr-sr-only" }, "Relations de l’application"),
      h(RelationshipsTab, { application, isMobile: matchMedia("(max-width: 48rem)").matches }),
    ]),
})
  .use(createPinia())
  .use(router)
  .use(PrimeVue)
  .mount("#app");

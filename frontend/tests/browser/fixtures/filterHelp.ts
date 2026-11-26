import { createApp, h } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { client } from "../../../src/client/client.gen";
import SidebarFilter from "../../../src/components/search/SidebarFilter.vue";
import "@gouvfr/dsfr/dist/core/core.main.min.css";
import "@gouvfr/dsfr/dist/component/component.main.min.css";
import "@gouvfr/dsfr/dist/utility/utility.main.min.css";
import "@gouvfr/dsfr/dist/utility/icons/icons.main.min.css";
import "@gouvminint/vue-dsfr/styles";

client.setConfig({ baseUrl: location.origin });
const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/time", component: { template: "<div />" } }] });
await router.push("/time");
await router.isReady();
createApp({
  render: () => h("main", [h("h1", { class: "fr-h4" }, "Recette des filtres"), h(SidebarFilter, { type: "technicalDebtPoints" })]),
})
  .use(createPinia())
  .use(router)
  .mount("#app");

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import PrimeVue from "primevue/config";
import { client } from "../../../src/client/client.gen";
import MetadataPage from "../../../src/views/MetadataPage.vue";
import "@gouvfr/dsfr/dist/core/core.main.min.css";
import "@gouvfr/dsfr/dist/component/component.main.min.css";
import "@gouvfr/dsfr/dist/utility/utility.main.min.css";
import "@gouvminint/vue-dsfr/styles";

client.setConfig({ baseUrl: location.origin });
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", component: MetadataPage },
    { path: "/metadata/:id", name: "metadata-detail", component: { template: "<div />" } },
  ],
});
await router.push("/");
await router.isReady();
createApp(MetadataPage).use(createPinia()).use(router).use(PrimeVue).mount("#app");

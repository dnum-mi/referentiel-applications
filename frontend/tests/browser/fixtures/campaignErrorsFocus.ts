import { createApp, h } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import PrimeVue from "primevue/config";
import { client } from "../../../src/client/client.gen";
import type { MditCampaignDto, QualityCampaignDto } from "../../../src/client/types.gen";
import { routeNames } from "../../../src/router/route-names";
import QualityCampaignTargetsPage from "../../../src/views/QualityCampaignTargetsPage.vue";
import EndOfLifePage from "../../../src/views/EndOfLifePage.vue";
import QualityCampaignActions from "../../../src/components/admin/QualityCampaignActions.vue";
import MditCampaignActions from "../../../src/components/admin/MditCampaignActions.vue";
import AppToaster from "../../../src/components/AppToaster.vue";
import { useUserStore } from "../../../src/stores/userStore";
import { useToasterStore } from "../../../src/stores/toasterStore";
import "@gouvfr/dsfr/dist/core/core.main.min.css";
import "@gouvfr/dsfr/dist/component/component.main.min.css";
import "@gouvfr/dsfr/dist/utility/utility.main.min.css";
import "@gouvminint/vue-dsfr/styles";

const qualityCampaign = {
  id: "quality-qa",
  name: "Campagne qualité fictive",
  filters: {},
  sponsorEmails: [],
  startDate: new Date("2026-11-20T00:00:00Z"),
  createdAt: new Date("2026-11-20T00:00:00Z"),
  status: "scheduled",
  targetCount: 30,
} satisfies QualityCampaignDto;
const mditCampaign = { id: "mdit-qa", year: 2026, label: "Millésime fictif", isActive: true } satisfies MditCampaignDto;

client.setConfig({ baseUrl: location.origin });
const pinia = createPinia();
const user = useUserStore(pinia);
const toaster = useToasterStore(pinia);
// Le client OIDC réel reste sans session ; seuls les GET /config et /users/me simulés
// initialisent les droits fictifs. Aucune connexion à un fournisseur n'est nécessaire.
await user.fetchUser();
user.authenticated = true;

const view = new URLSearchParams(location.search).get("view");
const component = view === "targets" ? QualityCampaignTargetsPage : view === "technologies" ? EndOfLifePage : null;
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/campagnes/:id", component: { render: () => null } },
    { path: "/administration", name: routeNames.ADMINPAGE, component: { render: () => null } },
    { path: "/application/:id", name: routeNames.PROFILEAPP, component: { render: () => null } },
    { path: "/", name: routeNames.ACCUEIL, component: { render: () => null } },
  ],
});
await router.push("/campagnes/quality-qa");
await router.isReady();
createApp({
  render: () => [
    h("button", { type: "button", "data-testid": "outside-control" }, "Commande persistante extérieure"),
    component
      ? h(component)
      : view === "quality"
        ? h(QualityCampaignActions, { campaign: qualityCampaign })
        : h(MditCampaignActions, { campaign: mditCampaign }),
    h(AppToaster, { messages: toaster.messages }),
  ],
})
  .use(pinia)
  .use(router)
  .use(PrimeVue)
  .mount("#app");

import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import QualityCampaignTargetsPage from "./QualityCampaignTargetsPage.vue";
import { routeNames } from "@/router/route-names";

const { findTargets, findCampaign } = vi.hoisted(() => ({ findTargets: vi.fn(), findCampaign: vi.fn() }));
vi.mock("@/api", () => ({
  default: { qualityCampaignControllerFindTargets: findTargets, qualityCampaignControllerFindOne: findCampaign },
}));
const Table = defineComponent({
  props: { items: Array, first: Number, rows: Number, totalRecords: Number },
  emits: ["page", "sort"],
  template: `<div><div v-for="item in items" :key="item.applicationId">
    <slot name="body-label" :data="item" /><slot name="body-iqAtStart" :data="item" />
    <slot name="body-iqCurrent" :data="item" /><slot name="body-delta" :data="item" />
    </div></div>`,
});
const rows = [
  { applicationId: "a", label: "Améliorée", iqAtStart: 50, iqCurrent: 65, delta: 15 },
  { applicationId: "b", label: "Stable", iqAtStart: 50, iqCurrent: 50, delta: 0 },
  { applicationId: "c", label: "Inconnue", iqAtStart: null, iqCurrent: 40, delta: null },
];
async function render(url = "/campaign/cibles") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/:id/cibles", component: QualityCampaignTargetsPage },
      { path: "/applications/:id", name: routeNames.PROFILEAPP, component: { template: "<p>Fiche</p>" } },
      { path: "/administration", name: routeNames.ADMINPAGE, component: { template: "<p>Administration</p>" } },
    ],
  });
  await router.push(url);
  await router.isReady();
  const wrapper = mount(
    { template: "<RouterView />" },
    {
      global: {
        plugins: [router],
        stubs: {
          RefAppTable: Table,
          QualityCampaignTargetDetails: true,
          DsfrButton: { props: ["label"], template: "<button>{{ label }}</button>" },
        },
      },
    },
  );
  await flushPromises();
  return { wrapper, router };
}
enableAutoUnmount(afterEach);
beforeEach(() => {
  findTargets.mockReset().mockResolvedValue({ data: { results: rows, total: 3 }, response: { ok: true } });
  findCampaign
    .mockReset()
    .mockResolvedValue({ data: { name: "Campagne novembre", sentAt: "2026-11-10T12:00:00Z" }, response: { ok: true } });
});

it("affiche +15, zéro et non comparable sans confondre un IQ inconnu", async () => {
  const { wrapper } = await render();
  expect(wrapper.text()).toContain("+15");
  expect(wrapper.text()).toContain("Stable (0)");
  expect(wrapper.text()).toContain("Inconnu40");
  expect(wrapper.text()).toContain("Non comparable");
  expect(wrapper.get('a[href="/applications/a"]').text()).toBe("Améliorée");
});
it("conserve filtre, tri et page au retour de fiche et recharge les valeurs", async () => {
  const { wrapper, router } = await render();
  await wrapper.get("select").setValue("stable_or_declining");
  await flushPromises();
  wrapper.getComponent(Table).vm.$emit("sort", { sortField: "delta", sortOrder: -1 });
  await flushPromises();
  wrapper.getComponent(Table).vm.$emit("page", { page: 2, rows: 5 });
  await flushPromises();
  const url = router.currentRoute.value.fullPath;
  expect(findTargets).toHaveBeenLastCalledWith({
    path: { id: "campaign" },
    query: { progression: "stable_or_declining", sortBy: "delta", order: "desc", page: 2, pageSize: 5 },
  });
  await wrapper.get('a[href="/applications/a"]').trigger("click");
  await flushPromises();
  router.back();
  await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe(url);
  expect(wrapper.getComponent(Table).props("first")).toBe(10);
  expect(findTargets).toHaveBeenCalledTimes(5);
});
it("normalise les paramètres invalides et permet de réessayer après une erreur réseau", async () => {
  findTargets.mockRejectedValueOnce(new Error("network"));
  const { wrapper } = await render("/campaign/cibles?page=-1&pageSize=0&order=oops&progression=oops");
  expect(findTargets).toHaveBeenLastCalledWith({
    path: { id: "campaign" },
    query: { page: 0, pageSize: 15, order: "asc", sortBy: "delta", progression: undefined },
  });
  expect(wrapper.get('[role="alert"]').text()).toContain("Impossible de charger");
  expect(wrapper.find('[role="status"]').exists()).toBe(false);
  expect(wrapper.findComponent(Table).exists()).toBe(false);
  await wrapper.get('[role="alert"] button').trigger("click");
  await flushPromises();
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  expect(wrapper.text()).toContain("Améliorée");
});
it("ne montre aucune cible lorsque la consultation est refusée", async () => {
  findTargets.mockResolvedValue({ response: { ok: false, status: 403 } });
  const { wrapper } = await render();
  expect(wrapper.text()).toContain("Vous n’avez pas accès");
  expect(wrapper.find('a[href="/applications/a"]').exists()).toBe(false);
});

it("affiche le contexte et permet d’actualiser sans perdre sa sélection", async () => {
  const { wrapper, router } = await render("/campaign/cibles?progression=positive&page=2&pageSize=5&order=desc");
  expect(wrapper.get("h1").text()).toBe("Campagne novembre");
  expect(wrapper.text()).toContain("10/11/2026");
  expect(wrapper.get('a[href="/administration?tab=tab-quality-campaigns"]').text()).toBe("Retour aux campagnes qualité");
  const url = router.currentRoute.value.fullPath;
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Actualiser")!
    .trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.fullPath).toBe(url);
  expect(findTargets).toHaveBeenCalledTimes(2);
  expect(findCampaign).toHaveBeenCalledTimes(2);
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Toutes les progressions")!
    .trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.query).toEqual({ page: "0", pageSize: "5", order: "desc" });
});
it("laisse consulter les cibles si les informations de campagne ne se chargent pas", async () => {
  findCampaign.mockRejectedValueOnce(new Error("network"));
  const { wrapper } = await render();
  expect(wrapper.text()).toContain("Le nom et la date de la campagne n’ont pas pu être chargés");
  expect(wrapper.get('a[href="/applications/a"]').text()).toBe("Améliorée");
});

it.each(["label", "iqAtStart", "iqCurrent"])("trie par %s et restaure ce tri depuis l’URL", async (sortBy) => {
  const { wrapper, router } = await render(`/campaign/cibles?sortBy=${sortBy}&page=2&order=desc`);
  expect(findTargets).toHaveBeenLastCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ sortBy, page: 2, order: "desc" }) }),
  );
  wrapper.getComponent(Table).vm.$emit("sort", { sortField: sortBy, sortOrder: 1 });
  await flushPromises();
  expect(router.currentRoute.value.query).toEqual({ sortBy, page: "0", order: "asc" });
  expect(findTargets).toHaveBeenLastCalledWith(
    expect.objectContaining({ query: expect.objectContaining({ sortBy, page: 0, order: "asc" }) }),
  );
});

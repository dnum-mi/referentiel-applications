import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import QualityCampaignTargetDetails from "./QualityCampaignTargetDetails.vue";
const { quality, actors } = vi.hoisted(() => ({ quality: vi.fn(), actors: vi.fn() }));
vi.mock("@/api", () => ({ default: { applicationControllerGetQualitySummary: quality, applicationActorsControllerFindAll: actors } }));
enableAutoUnmount(afterEach);
function render() {
  return mount(QualityCampaignTargetDetails, {
    props: { applicationId: "a", applicationLabel: "Application test" },
    global: {
      stubs: {
        Teleport: true,
        DsfrModal: {
          name: "DsfrModal",
          props: ["opened", "title", "origin", "modalId"],
          emits: ["close"],
          template: '<section v-if="opened" role="dialog"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>',
        },
        QualityNextActions: true,
        OrgaLink: true,
        RefAppTable: true,
        DsfrButton: { props: ["label"], template: "<button>{{ label }}</button>" },
      },
    },
  });
}
beforeEach(() => {
  quality.mockReset().mockResolvedValue({ data: {}, response: { ok: true } });
  actors.mockReset().mockResolvedValue({ data: { results: [], total: 0 }, response: { ok: true } });
});
it("charge à la demande et distingue acteurs interdits et absence d'acteurs", async () => {
  actors.mockResolvedValueOnce({ response: { ok: false, status: 403 } });
  const wrapper = render();
  expect(actors).not.toHaveBeenCalled();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(wrapper.text()).toContain("Interlocuteurs non consultables");
  expect(wrapper.findComponent({ name: "QualityNextActions" }).exists()).toBe(true);
  expect(wrapper.findComponent({ name: "RefAppTable" }).exists()).toBe(false);
  await wrapper.findAll("button")[1].trigger("click");
  await flushPromises();
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  expect(wrapper.getComponent({ name: "RefAppTable" }).attributes("emptymessage")).toBe("Aucun interlocuteur référencé.");
});
it("propose un réessai après une erreur réseau et transmet la pagination des acteurs", async () => {
  quality.mockRejectedValueOnce(new Error("network"));
  const wrapper = render();
  await wrapper.get("button").trigger("click");
  await flushPromises();
  expect(wrapper.text()).toContain("Impossible de charger les critères");
  await wrapper.findAll("button")[1].trigger("click");
  await flushPromises();
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  wrapper.getComponent({ name: "RefAppTable" }).vm.$emit("page", { page: 1, rows: 10 });
  await flushPromises();
  expect(actors).toHaveBeenLastCalledWith({ path: { applicationId: "a" }, query: { page: 1, pageSize: 10 } });
});

it("ouvre les détails dans une modale nommée et permet de la fermer puis de les actualiser", async () => {
  const wrapper = render();
  const trigger = wrapper.get("button");
  expect(trigger.attributes("aria-haspopup")).toBe("dialog");
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  await trigger.trigger("click");
  await flushPromises();
  expect(wrapper.get('[role="dialog"] h2').text()).toBe("Détails de Application test");
  expect(wrapper.getComponent({ name: "DsfrModal" }).props("origin")).toBe(trigger.element);
  await wrapper.get('[role="dialog"] button').trigger("click");
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  await trigger.trigger("click");
  await flushPromises();
  expect(quality).toHaveBeenCalledTimes(2);
  wrapper.getComponent({ name: "DsfrModal" }).vm.$emit("close");
  await flushPromises();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

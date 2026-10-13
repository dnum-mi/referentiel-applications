import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import BusinessDivisionSearch from "./BusinessDivisionSearch.vue";

vi.mock("@/api", () => ({
  default: {
    businessDivisionControllerFindById: vi.fn(async ({ path }: { path: { id: string } }) => ({ data: { id: path.id, label: path.id } })),
  },
}));
enableAutoUnmount(afterEach);

async function renderSelection() {
  const wrapper = mount(
    defineComponent({
      setup() {
        const ids = ref(["Alpha", "Beta", "Gamma"]);
        return () =>
          h("div", [
            h(BusinessDivisionSearch, {
              businessDivisionIds: ids.value,
              label: "Directions métier",
              "onUpdate:businessDivisionIds": (value) => {
                ids.value = value;
              },
            }),
            h("button", { id: "outside-selection" }, "Continuer"),
          ]);
      },
    }),
    { attachTo: document.body, global: { stubs: { VIcon: true } } },
  );
  await flushPromises();
  return wrapper;
}

describe("BusinessDivisionSearch — retrait au clavier", () => {
  it("garde un point de reprise dans la sélection puis dans la recherche", async () => {
    const wrapper = await renderSelection();
    for (const [removed, next] of [
      ["Beta", "Gamma"],
      ["Gamma", "Alpha"],
      ["Alpha", null],
    ] as const) {
      const button = wrapper.get<HTMLButtonElement>(`[aria-label="Retirer la direction métier : ${removed}"]`);
      button.element.focus();
      await button.trigger("click");
      expect(wrapper.find(`[aria-label="Retirer la direction métier : ${removed}"]`).exists()).toBe(false);
      expect(wrapper.get(next ? `[aria-label="Retirer la direction métier : ${next}"]` : '[role="combobox"]').element).toHaveFocus();
    }
  });
  it("respecte un déplacement volontaire du focus pendant la mise à jour du parent", async () => {
    const wrapper = await renderSelection();
    const button = wrapper.get<HTMLButtonElement>('[aria-label="Retirer la direction métier : Alpha"]');
    button.element.focus();
    const update = button.trigger("click");
    const outside = wrapper.get<HTMLButtonElement>("#outside-selection");
    outside.element.focus();
    await update;
    expect(outside.element).toHaveFocus();
    expect(wrapper.find('[aria-label="Retirer la direction métier : Alpha"]').exists()).toBe(false);
  });
});

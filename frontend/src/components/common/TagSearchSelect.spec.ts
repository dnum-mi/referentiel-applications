import { enableAutoUnmount, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import TagSearchSelect from "./TagSearchSelect.vue";

enableAutoUnmount(afterEach);

function renderSelection() {
  return mount(
    defineComponent({
      setup() {
        const tags = ref(["Alpha", "Beta", "Gamma"]);
        return () =>
          h("div", [
            h(TagSearchSelect, {
              tags: tags.value,
              "onUpdate:tags": (value) => {
                tags.value = value;
              },
            }),
            h("button", { id: "outside-selection" }, "Continuer"),
          ]);
      },
    }),
    { attachTo: document.body, global: { stubs: { VIcon: true } } },
  );
}

describe("TagSearchSelect — retrait au clavier", () => {
  it("garde un point de reprise dans la sélection puis dans la recherche", async () => {
    const wrapper = renderSelection();
    for (const [removed, next] of [
      ["Beta", "Gamma"],
      ["Gamma", "Alpha"],
      ["Alpha", null],
    ] as const) {
      const button = wrapper.get<HTMLButtonElement>(`[aria-label="Retirer le tag : ${removed}"]`);
      button.element.focus();
      await button.trigger("click");
      expect(wrapper.find(`[aria-label="Retirer le tag : ${removed}"]`).exists()).toBe(false);
      expect(wrapper.get(next ? `[aria-label="Retirer le tag : ${next}"]` : '[role="combobox"]').element).toHaveFocus();
    }
  });
  it("respecte un déplacement volontaire du focus pendant la mise à jour du parent", async () => {
    const wrapper = renderSelection();
    const button = wrapper.get<HTMLButtonElement>('[aria-label="Retirer le tag : Alpha"]');
    button.element.focus();
    const update = button.trigger("click");
    const outside = wrapper.get<HTMLButtonElement>("#outside-selection");
    outside.element.focus();
    await update;
    expect(outside.element).toHaveFocus();
    expect(wrapper.find('[aria-label="Retirer le tag : Alpha"]').exists()).toBe(false);
  });
});

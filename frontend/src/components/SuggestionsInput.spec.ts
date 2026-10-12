import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import SuggestionsInput from "./SuggestionsInput.vue";

const inputStub = {
  props: ["modelValue"],
  emits: ["update:modelValue"],
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
};

function renderInput(search: (query: string) => Promise<{ id: string; label: string }[]>) {
  return mount(SuggestionsInput, {
    props: { label: "Application", placeholder: "Rechercher", searchDataFunction: search },
    global: { stubs: { DsfrInput: inputStub, DsfrTag: { props: ["label"], template: "<span>{{ label }}</span>" }, DsfrTooltip: true } },
  });
}

afterEach(() => vi.useRealTimers());

describe("SuggestionsInput", () => {
  it("réactive les filtres du parent après une réinitialisation du champ pendant une requête", async () => {
    vi.useFakeTimers();
    const componentKey = ref(0);
    const parentIsLoading = ref(false);
    let resolve!: (value: { id: string; label: string }[]) => void;
    const search = vi.fn(
      () =>
        new Promise<{ id: string; label: string }[]>((res) => {
          resolve = res;
        }),
    );
    const parent = defineComponent({
      setup: () => () =>
        h("div", [
          h(SuggestionsInput, {
            key: componentKey.value,
            label: "Application",
            placeholder: "Rechercher",
            searchDataFunction: search,
            "onUpdate:isLoading": (value: boolean) => {
              parentIsLoading.value = value;
            },
          }),
          h("select", { disabled: parentIsLoading.value }),
        ]),
    });
    const wrapper = mount(parent, { global: { stubs: { DsfrInput: inputStub, DsfrTag: true, DsfrTooltip: true } } });

    await wrapper.get("input").setValue("application");
    await vi.advanceTimersByTimeAsync(300);
    expect(wrapper.get("select").element.disabled).toBe(true);

    componentKey.value++;
    await nextTick();
    expect(wrapper.get("select").element.disabled).toBe(false);
    resolve([{ id: "old", label: "Ancienne réponse" }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(wrapper.get("select").element.disabled).toBe(false);
    expect(wrapper.find('[data-testid="suggestions-list"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("respecte les 300 ms et n'affiche pas une réponse dépassée avant la prochaine recherche", async () => {
    vi.useFakeTimers();
    let resolve!: (value: { id: string; label: string }[]) => void;
    const search = vi.fn(
      () =>
        new Promise<{ id: string; label: string }[]>((res) => {
          resolve = res;
        }),
    );
    const wrapper = renderInput(search);

    await wrapper.get("input").setValue("app");
    await vi.advanceTimersByTimeAsync(299);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(wrapper.find('[data-testid="suggestions-loading"]').exists()).toBe(true);

    await wrapper.get("input").setValue("ap");
    resolve([{ id: "old", label: "Ancienne réponse" }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(wrapper.find('[data-testid="suggestions-list"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="suggestions-loading"]').exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(search).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("affiche l'erreur, permet de réessayer puis efface les suggestions après sélection", async () => {
    vi.useFakeTimers();
    const selected = { id: "app-1", label: "Application trouvée" };
    const search = vi.fn().mockRejectedValueOnce(new Error("indisponible")).mockResolvedValueOnce([selected]);
    const wrapper = renderInput(search);
    await wrapper.get("input").setValue("premier");
    await vi.advanceTimersByTimeAsync(300);
    expect(wrapper.get('[role="alert"]').text()).toBe("Erreur lors de la recherche.");

    await wrapper.get("input").setValue("second");
    expect(wrapper.get('[role="alert"]').text()).toBe("");
    await vi.advanceTimersByTimeAsync(300);
    await wrapper.get('[data-testid="suggestion-item-app-1"]').trigger("click");
    await nextTick();
    expect(wrapper.emitted("update:selectedValue")).toEqual([[selected]]);
    expect(wrapper.find('[data-testid="suggestions-list"]').exists()).toBe(false);
    expect(wrapper.get("input").element.value).toBe("");
    await vi.advanceTimersByTimeAsync(300);
    expect(search).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("permet de sélectionner au clavier et garde un descendant actif existant", async () => {
    vi.useFakeTimers();
    const items = [
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
    ];
    const wrapper = renderInput(() => Promise.resolve(items));
    const input = wrapper.get("input");
    await input.setValue("app");
    await vi.advanceTimersByTimeAsync(300);
    await input.trigger("keydown", { key: "ArrowUp" });
    const selected = wrapper.get('[role="option"][aria-selected="true"]');
    expect(selected.text()).toBe("Beta");
    expect(input.attributes("aria-activedescendant")).toBe(selected.attributes("id"));
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:selectedValue")).toEqual([[items[1]]]);
    expect(input.attributes("aria-expanded")).toBe("false");
    expect(input.attributes("aria-activedescendant")).toBeUndefined();
    wrapper.unmount();
  });

  it("ferme et rouvre les suggestions avec Échap et les flèches, sans perdre la saisie", async () => {
    vi.useFakeTimers();
    const wrapper = renderInput(() => Promise.resolve([{ id: "a", label: "Alpha" }]));
    const input = wrapper.get("input");
    await input.setValue("app");
    await vi.advanceTimersByTimeAsync(300);
    await input.trigger("keydown", { key: "ArrowDown" });
    await input.trigger("keydown", { key: "Escape" });
    expect(input.element.value).toBe("app");
    expect(input.attributes("aria-expanded")).toBe("false");
    expect(input.attributes("aria-activedescendant")).toBeUndefined();
    await input.trigger("keydown", { key: "ArrowDown" });
    expect(input.attributes("aria-expanded")).toBe("true");
    expect(wrapper.get('[role="option"][aria-selected="true"]').text()).toBe("Alpha");
    wrapper.unmount();
  });
});

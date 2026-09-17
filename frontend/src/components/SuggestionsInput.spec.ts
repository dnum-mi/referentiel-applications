import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
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
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
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
});

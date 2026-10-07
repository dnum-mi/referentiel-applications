import { flushPromises, mount } from "@vue/test-utils";
import AccessibleAutocomplete from "./AccessibleAutocomplete.vue";

function renderAutocomplete(search: (query: string) => Promise<string[]>) {
  return mount(AccessibleAutocomplete<string>, {
    props: { id: "app", search, displayLabel: (item: string) => item },
  });
}

afterEach(() => vi.useRealTimers());

describe("AccessibleAutocomplete", () => {
  it("ne déclare pas la liste ouverte tant qu'elle n'est pas rendue", async () => {
    vi.useFakeTimers();
    const wrapper = renderAutocomplete(() => Promise.resolve([]));
    const input = wrapper.get("input");

    await input.setValue("ab");

    // Saisie en cours, aucune requête lancée : rien n'est affiché.
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(input.attributes("aria-expanded")).toBe("false");
    expect(input.attributes("aria-controls")).toBeUndefined();

    // Recherche aboutie sans résultat (et sans message « Aucun résultat ») : toujours rien.
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(input.attributes("aria-expanded")).toBe("false");
  });

  it("pointe aria-controls vers la liste affichée", async () => {
    vi.useFakeTimers();
    const wrapper = renderAutocomplete(() => Promise.resolve(["Alpha", "Beta"]));
    const input = wrapper.get("input");

    await input.setValue("al");
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    const list = wrapper.get('[role="listbox"]');
    expect(input.attributes("aria-expanded")).toBe("true");
    expect(input.attributes("aria-controls")).toBe(list.attributes("id"));
  });
});

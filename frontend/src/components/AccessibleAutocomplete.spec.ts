import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { within } from "@testing-library/vue";
import AccessibleAutocomplete from "./AccessibleAutocomplete.vue";

function renderAutocomplete(search: (query: string) => Promise<string[]>) {
  return mount(AccessibleAutocomplete<string>, {
    props: { id: "app", search, displayLabel: (item: string) => item },
  });
}

afterEach(() => vi.useRealTimers());

describe("AccessibleAutocomplete", () => {
  it("présente un résultat vide comme statut sans ouvrir une liste sans option", async () => {
    vi.useFakeTimers();
    const wrapper = mount(AccessibleAutocomplete<string>, {
      props: { search: () => Promise.resolve([]), displayLabel: (item: string) => item, displayNoResult: true },
    });
    await wrapper.get("input").setValue("aucun");
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(within(wrapper.get("div").element).getByRole("status")).toHaveTextContent("Aucun résultat");
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.get("input").attributes("aria-expanded")).toBe("false");
    expect(wrapper.get("input").attributes("aria-controls")).toBeUndefined();
    await wrapper.get("input").trigger("keydown", { key: "Escape" });
    expect(within(wrapper.get("div").element).getByRole("status")).toBeEmptyDOMElement();
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("annonce les erreurs en alerte et ferme la liste de suggestions", async () => {
    vi.useFakeTimers();
    const wrapper = renderAutocomplete(() => Promise.reject(new Error("Service indisponible")));
    await wrapper.get("input").setValue("erreur");
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).not.toBe("");
    expect(within(wrapper.get("div").element).getByRole("status")).toBeEmptyDOMElement();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.get("input").attributes("aria-expanded")).toBe("false");
    expect(wrapper.get("input").attributes("aria-controls")).toBeUndefined();
  });
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

  it("sélectionne la dernière suggestion avec flèche haute et Entrée", async () => {
    vi.useFakeTimers();
    const wrapper = renderAutocomplete(() => Promise.resolve(["Alpha", "Beta"]));
    const input = wrapper.get("input");
    await input.setValue("al");
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    await input.trigger("keydown", { key: "ArrowUp" });
    expect(input.attributes("aria-activedescendant")).toBe(wrapper.get('[aria-selected="true"]').attributes("id"));
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("onChange")).toEqual([["Beta"]]);
    expect(input.attributes("aria-expanded")).toBe("false");
    expect(input.attributes("aria-activedescendant")).toBeUndefined();
  });

  it("réserve le premier Échap aux suggestions puis transmet la fermeture du dialogue", async () => {
    vi.useFakeTimers();
    const wrapper = renderAutocomplete(() => Promise.resolve(["Alpha"]));
    const input = wrapper.get("input");
    await input.setValue("al");
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    await input.trigger("keydown", { key: "Escape" });
    expect(input.attributes("aria-expanded")).toBe("false");
    expect(input.element.value).toBe("al");
    expect(wrapper.emitted("close")).toBeUndefined();
    await input.trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("attribue des identifiants distincts à deux champs sans id explicite", () => {
    const props = { search: () => Promise.resolve([]), displayLabel: (item: string) => item };
    const parent = defineComponent({
      setup: () => () => h("div", [h(AccessibleAutocomplete<string>, props), h(AccessibleAutocomplete<string>, props)]),
    });
    const wrapper = mount(parent);
    const inputs = wrapper.findAll("input");
    expect(inputs[0].attributes("id")).not.toBe(inputs[1].attributes("id"));
    for (const input of inputs) {
      expect(wrapper.find(`[id="${input.attributes("aria-describedby")}"]`).exists()).toBe(true);
    }
    wrapper.unmount();
  });
});

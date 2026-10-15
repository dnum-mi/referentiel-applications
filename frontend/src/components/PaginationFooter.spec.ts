import { mount } from "@vue/test-utils";
import { h } from "vue";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import PaginationFooter from "./PaginationFooter.vue";

function renderFooter() {
  return mount(PaginationFooter, {
    props: { totalFiltered: 42, limit: 15, page: 0 },
  });
}

describe("PaginationFooter", () => {
  it("expose une seule zone de navigation nommée", () => {
    const wrapper = renderFooter();

    expect(wrapper.findAll("nav")).toHaveLength(1);
    expect(wrapper.get("nav").attributes("aria-label")).toBe("Pagination");
  });

  it("propose les tailles de page communes à toutes les listes", () => {
    const wrapper = renderFooter();

    const options = wrapper.findAll('[data-testid="pagination-rows-select"] option').map((option) => Number(option.attributes("value")));
    expect(options).toEqual(PAGE_SIZE_OPTIONS);
  });

  it("nomme les pages, expose la page courante et annonce le nouveau contexte", async () => {
    const wrapper = renderFooter();

    expect(wrapper.findAll("a")).toHaveLength(0);
    expect(wrapper.get('[aria-current="page"]').attributes("aria-label")).toBe("Page 1 sur 3");
    const status = wrapper.get('[data-testid="pagination-page-status"]');
    expect(status.element.tagName).toBe("OUTPUT");
    await wrapper.setProps({ page: 1 });
    expect(status.text()).toBe("Page 2 sur 3");
    expect(status.attributes("aria-atomic")).toBe("true");
    expect(wrapper.get('[data-testid="pagination-next"]').attributes("aria-label")).toBe("Page suivante (page 3 sur 3)");
  });

  it("affiche la taille courante même si elle est absente des choix communs", async () => {
    const wrapper = renderFooter();
    await wrapper.setProps({ limit: 10 });
    expect(wrapper.get<HTMLSelectElement>("select").element.value).toBe("10");
    expect(wrapper.findAll("option").map((option) => option.text())).toEqual(["5", "10", "15", "30", "50", "100"]);
  });

  it("garde les mêmes boutons aux bornes sans action supplémentaire", async () => {
    const wrapper = mount(PaginationFooter, { attachTo: document.body, props: { totalFiltered: 42, limit: 15, page: 1 } });
    const next = wrapper.get<HTMLButtonElement>('[data-testid="pagination-next"]');
    next.element.focus();
    await next.trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[2]]);
    await wrapper.setProps({ page: 2 });
    expect(document.activeElement).toBe(next.element);
    expect(next.element.disabled).toBe(false);
    expect(next.attributes("aria-disabled")).toBe("true");
    await next.trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[2]]);
    const prev = wrapper.get<HTMLButtonElement>('[data-testid="pagination-prev"]');
    prev.element.focus();
    await wrapper.setProps({ page: 0 });
    expect(document.activeElement).toBe(prev.element);
    await prev.trigger("click");
    expect(wrapper.emitted("update:page")).toEqual([[2]]);
    wrapper.unmount();
  });

  it("borne la liste des pages sans construire une entrée par résultat", async () => {
    const wrapper = renderFooter();
    await wrapper.setProps({ totalFiltered: 1_000_000, limit: 5, page: 1000 });
    expect(wrapper.findAll('button[aria-label^="Page "]:not([data-testid])')).toHaveLength(7);
    expect(wrapper.get('[aria-current="page"]').text()).toBe("1001");
    await wrapper.setProps({ totalFiltered: 0, page: 0 });
    expect(wrapper.get('[data-testid="pagination-page-status"]').text()).toBe("Page 1 sur 1");
    expect(wrapper.findAll('button[aria-disabled="true"]')).toHaveLength(4);
  });

  it("utilise des identifiants de champs uniques et ne double pas la navigation de la table", () => {
    const wrapper = mount({
      render: () =>
        h("div", [
          h(PaginationFooter, { totalFiltered: 42, limit: 15, page: 0 }),
          h(PaginationFooter, { totalFiltered: 0, limit: 15, page: 0, embedded: true }),
        ]),
    });
    const [one, two] = wrapper.findAllComponents(PaginationFooter);
    expect(one.get("select").attributes("id")).not.toBe(two.get("select").attributes("id"));
    expect(two.get("label").attributes("for")).toBe(two.get("select").attributes("id"));
    expect(two.find("nav").exists()).toBe(false);
  });
});

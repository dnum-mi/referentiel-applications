import { mount } from "@vue/test-utils";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import PaginationFooter from "./PaginationFooter.vue";

// Reproduit le rendu de DsfrPagination, qui porte déjà sa propre <nav>.
const DsfrPaginationStub = {
  template: '<nav role="navigation" aria-label="Pagination"><a class="fr-pagination__link">1</a></nav>',
};

function renderFooter() {
  return mount(PaginationFooter, {
    props: { totalFiltered: 42, limit: 15, page: 0 },
    global: { stubs: { DsfrPagination: DsfrPaginationStub } },
  });
}

describe("PaginationFooter", () => {
  it("n'ajoute pas de landmark de navigation autour de DsfrPagination", () => {
    const wrapper = renderFooter();

    expect(wrapper.findAll("nav")).toHaveLength(1);
  });

  it("propose les tailles de page communes à toutes les listes", () => {
    const wrapper = renderFooter();

    const options = wrapper.findAll('[data-testid="pagination-rows-select"] option').map((option) => Number(option.attributes("value")));
    expect(options).toEqual(PAGE_SIZE_OPTIONS);
  });

  it("garde l'intitulé « Page N » sur les liens numérotés", () => {
    const wrapper = renderFooter();

    expect(wrapper.get("a.fr-pagination__link").attributes("aria-label")).toBe("Page 1");
  });
});

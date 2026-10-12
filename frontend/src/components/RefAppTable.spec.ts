import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import RefAppTable from "./RefAppTable.vue";
import DataTable from "primevue/datatable";
import { primeVueFrenchLocale } from "@/constants/primevue-locale";

describe("RefAppTable", () => {
  it("applique une largeur depuis le formulaire sans tri ni pagination", async () => {
    const wrapper = mount(RefAppTable, {
      props: {
        items: [{ label: "Portail", status: "Production" }],
        columns: [
          { field: "label", header: "Application" },
          { field: "status", header: "Statut" },
        ],
      },
      global: { plugins: [[PrimeVue, { unstyled: true }]] },
    });
    const details = wrapper.get("details");
    await details.trigger("toggle");
    const form = wrapper.findAll("form")[0];
    const input = form.get("input");
    expect(form.get("label").attributes("for")).toBe(input.attributes("id"));
    await input.setValue("420");
    await form.trigger("submit");
    expect((wrapper.get("thead th").element as HTMLElement).style.width).toBe("420px");
    expect((wrapper.get("thead th").element as HTMLElement).style.getPropertyPriority("width")).toBe("important");
    expect((wrapper.get("table").element as HTMLElement).style.width).toBe("620px");
    expect(wrapper.emitted("columnResize")).toEqual([[{ field: "label", width: "420px" }]]);
    expect(wrapper.emitted("sort")).toBeUndefined();
    expect(wrapper.emitted("page")).toBeUndefined();
    wrapper.unmount();
  });

  it("préserve le glissement souris après un réglage de largeur et synchronise la colonne voisine", async () => {
    const wrapper = mount(RefAppTable, {
      props: {
        items: [{ label: "Portail" }],
        columns: [
          { field: "label", header: "Application", width: "300px" },
          { field: "status", header: "Statut", width: "200px" },
        ],
      },
      global: { plugins: [[PrimeVue, { unstyled: true }]] },
    });
    const header = wrapper.get("thead th").element;
    expect((header as HTMLElement).dataset.columnField).toBe("label");
    wrapper.findComponent(DataTable).vm.$emit("column-resize-end", { element: header, delta: 50 });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll("thead th").map((cell) => (cell.element as HTMLElement).style.width)).toEqual(["350px", "150px"]);
    expect(wrapper.emitted("columnResize")).toEqual([[{ field: "label", width: "350px" }], [{ field: "status", width: "150px" }]]);
    wrapper.unmount();
  });

  it("associe les cellules aux en-têtes et nomme la table et sa pagination en français", () => {
    const wrapper = mount(RefAppTable, {
      props: {
        items: [{ id: "1", label: "Portail", status: "En production" }],
        columns: [
          { field: "label", header: "Application", sortable: true },
          { field: "status", header: "Statut" },
        ],
        dataKey: "id",
        caption: "Applications du référentiel",
        paginator: true,
        totalRecords: 12,
      },
      global: { plugins: [[PrimeVue, { locale: primeVueFrenchLocale, unstyled: true }]] },
    });
    const table = wrapper.get("table");
    expect(wrapper.get(`[id="${table.attributes("aria-labelledby")}"]`).text()).toBe("Applications du référentiel");
    expect(wrapper.findAll("thead th").map((header) => header.attributes("scope"))).toEqual(["col", "col"]);
    expect(wrapper.findAll("thead th[tabindex='0']")).toHaveLength(0);
    expect(wrapper.find('[aria-label^="Page suivante ("]').exists()).toBe(true);
    expect(wrapper.get("label").text()).toBe("Application — largeur en pixels");
    expect(wrapper.get<HTMLSelectElement>('[data-testid="pagination-rows-select"]').element.labels?.[0]?.textContent).toBe(
      "Résultats par page",
    );
    expect(wrapper.findAll('nav[aria-label="Pagination"]')).toHaveLength(1);
    wrapper.unmount();
  });

  it("conserve la commande focalisée aux bornes et annonce la pagination client", async () => {
    const wrapper = mount(RefAppTable, {
      attachTo: document.body,
      props: {
        items: Array.from({ length: 12 }, (_, id) => ({ id, label: `Application ${id}` })),
        columns: [{ field: "label", header: "Application" }],
        paginator: true,
        rows: 5,
      },
      global: { plugins: [[PrimeVue, { locale: primeVueFrenchLocale, unstyled: true }]] },
    });
    const last = wrapper.get<HTMLButtonElement>('[data-testid="pagination-last"]');
    last.element.focus();
    await last.trigger("click");
    expect(document.activeElement).toBe(last.element);
    expect(last.attributes("aria-disabled")).toBe("true");
    expect(last.element.disabled).toBe(false);
    expect(wrapper.get('[data-testid="pagination-page-status"]').text()).toBe("Page 3 sur 3");
    expect(wrapper.findAll("tbody tr")).toHaveLength(2);
    const events = wrapper.emitted("page")?.length;
    await last.trigger("click");
    expect(wrapper.emitted("page")).toHaveLength(events!);
    const first = wrapper.get<HTMLButtonElement>('[data-testid="pagination-first"]');
    first.element.focus();
    await first.trigger("click");
    expect(document.activeElement).toBe(first.element);
    expect(wrapper.get('[data-testid="pagination-page-status"]').text()).toBe("Page 1 sur 3");
    expect(wrapper.findAll("tbody tr")).toHaveLength(5);
    wrapper.unmount();
  });

  it("émet une seule requête quand une nouvelle taille dépasse la dernière page serveur", async () => {
    const wrapper = mount(RefAppTable, {
      attachTo: document.body,
      props: {
        items: [{ label: "Dernière application" }],
        columns: [{ field: "label", header: "Application" }],
        lazy: true,
        paginator: true,
        rows: 5,
        first: 40,
        totalRecords: 42,
      },
      global: { plugins: [[PrimeVue, { unstyled: true }]] },
    });
    const select = wrapper.get<HTMLSelectElement>('[data-testid="pagination-rows-select"]');
    select.element.focus();
    await select.setValue("50");
    expect(wrapper.emitted("page")).toHaveLength(1);
    expect(wrapper.emitted("page")?.[0]?.[0]).toMatchObject({ page: 0, first: 0, rows: 50 });
    await wrapper.setProps({ rows: 50, first: 0, loading: true });
    await wrapper.setProps({ loading: false, items: [{ label: "Page rechargée" }] });
    expect(document.activeElement).toBe(select.element);
    expect(wrapper.get('[data-testid="pagination-page-status"]').text()).toBe("Page 1 sur 1");
    wrapper.unmount();
  });
});

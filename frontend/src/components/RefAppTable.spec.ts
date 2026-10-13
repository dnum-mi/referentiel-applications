import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import RefAppTable from "./RefAppTable.vue";
import DataTable from "primevue/datatable";
import { primeVueFrenchLocale } from "@/constants/primevue-locale";
import { defineComponent, h, ref } from "vue";

describe("RefAppTable", () => {
  it("nomme les cases selon leur état réel et synchronise la sélection individuelle et globale", async () => {
    const items = [
      { id: "1", label: "Alpha" },
      { id: "2", label: "Bravo" },
    ];
    const selected = ref<unknown[]>([]);
    const host = defineComponent({
      setup: () => () =>
        h(RefAppTable, {
          items,
          columns: [{ field: "label", header: "Application" }],
          dataKey: "id",
          selectable: true,
          selection: selected.value,
          "onUpdate:selection": (value) => {
            selected.value = value;
          },
        }),
    });
    const wrapper = mount(host, {
      attachTo: document.body,
      global: { plugins: [[PrimeVue, { locale: primeVueFrenchLocale, unstyled: true }]] },
    });
    const header = wrapper.get<HTMLInputElement>('thead input[type="checkbox"]');
    const rows = wrapper.findAll<HTMLInputElement>('tbody input[type="checkbox"]');
    expect(header.element).toHaveAccessibleName("Tout sélectionner");
    expect(header.element.checked).toBe(false);
    for (const row of rows) {
      expect(row.element).toHaveAccessibleName("Sélectionner la ligne");
      expect(row.element.checked).toBe(false);
    }
    rows[0].element.focus();
    await rows[0].setValue(true);
    expect(selected.value).toEqual([items[0]]);
    expect(rows[0].element).toHaveAccessibleName("Désélectionner la ligne");
    expect(rows[1].element).toHaveAccessibleName("Sélectionner la ligne");
    expect(header.element).toHaveAccessibleName("Tout sélectionner");
    expect(document.activeElement).toBe(rows[0].element);
    await rows[0].setValue(false);
    expect(selected.value).toEqual([]);
    expect(rows[0].element).toHaveAccessibleName("Sélectionner la ligne");
    header.element.focus();
    await header.setValue(true);
    expect(selected.value).toEqual(items);
    expect(header.element.checked).toBe(true);
    expect(header.element).toHaveAccessibleName("Tout désélectionner");
    for (const row of rows) {
      expect(row.element.checked).toBe(true);
      expect(row.element).toHaveAccessibleName("Désélectionner la ligne");
    }
    expect(document.activeElement).toBe(header.element);
    await header.setValue(false);
    expect(selected.value).toEqual([]);
    expect(header.element.checked).toBe(false);
    expect(header.element).toHaveAccessibleName("Tout sélectionner");
    for (const row of rows) {
      expect(row.element.checked).toBe(false);
      expect(row.element).toHaveAccessibleName("Sélectionner la ligne");
    }
    wrapper.unmount();
  });

  it("conserve le tri avec une commande d’aide distincte et laisse le navigateur activer son bouton au clavier", async () => {
    const wrapper = mount(RefAppTable, {
      props: {
        items: [{ label: "Bravo" }, { label: "Alpha" }],
        columns: [{ field: "label", header: "Application", sortable: true }],
      },
      slots: { "header-label": '<button type="button">Afficher l’aide</button>' },
      global: { plugins: [[PrimeVue, { unstyled: true }]] },
    });
    const sort = wrapper.get<HTMLButtonElement>(".ref-table-sort-button");
    expect(sort.element).toHaveAccessibleName("Application");
    expect(wrapper.get("th").findAll("button")).toHaveLength(2);
    for (const [key, code] of [
      ["Enter", "Enter"],
      [" ", "Space"],
    ]) {
      const event = new KeyboardEvent("keydown", { key, code, bubbles: true, cancelable: true });
      sort.element.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    await sort.trigger("click");
    expect(wrapper.emitted("sort")).toEqual([[{ sortField: "label", sortOrder: 1 }]]);
    expect(wrapper.findAll("tbody td").map((cell) => cell.text())).toEqual(["Alpha", "Bravo"]);
    await wrapper.get('th button[type="button"]:not(.ref-table-sort-button)').trigger("click");
    expect(wrapper.emitted("sort")).toHaveLength(1);
    wrapper.unmount();
  });

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

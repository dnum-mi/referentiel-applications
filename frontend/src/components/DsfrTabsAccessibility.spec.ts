import { DsfrTabContent, DsfrTabs } from "@gouvminint/vue-dsfr";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref } from "vue";

enableAutoUnmount(afterEach);
afterEach(() => {
  document.documentElement.scrollTop = 0;
});

const tabs = [
  { tabId: "first-tab", panelId: "first-panel", title: "Premier onglet" },
  { tabId: "second-tab", panelId: "second-panel", title: "Deuxième onglet" },
  { tabId: "last-tab", panelId: "last-panel", title: "Dernier onglet" },
];

function renderTabs(initialTab = 0) {
  return mount(
    defineComponent({
      components: { DsfrTabs, DsfrTabContent },
      setup() {
        const activeTab = ref(initialTab);
        return { activeTab, tabs };
      },
      template: `
        <DsfrTabs v-model="activeTab" :tab-titles="tabs" tab-list-name="Rubriques">
          <DsfrTabContent
            v-for="tab in tabs"
            :key="tab.tabId"
            :tab-id="tab.tabId"
            :panel-id="tab.panelId"
          >
            <input :id="tab.panelId + '-input'" :aria-label="'Champ ' + tab.title" />
          </DsfrTabContent>
        </DsfrTabs>
      `,
    }),
    { attachTo: document.body },
  );
}

describe("Accessibilité du clavier des onglets DSFR", () => {
  it.each([
    { key: "ArrowRight", initial: 2, selected: 0 },
    { key: "ArrowLeft", initial: 0, selected: 2 },
    { key: "Home", initial: 2, selected: 0 },
    { key: "End", initial: 0, selected: 2 },
  ])("prévient le défilement natif sur $key et conserve sélection et focus", async ({ key, initial, selected }) => {
    const wrapper = renderTabs(initial);
    const source = wrapper.get<HTMLButtonElement>(`#${tabs[initial].tabId}`);
    const destination = wrapper.get<HTMLButtonElement>(`#${tabs[selected].tabId}`);
    const ancestorListener = vi.fn();
    wrapper.element.addEventListener("keydown", ancestorListener);
    source.element.focus();
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });

    source.element.dispatchEvent(event);
    await nextTick();

    expect(event.defaultPrevented).toBe(true);
    expect(ancestorListener).toHaveBeenCalledOnce();
    expect(destination.attributes("aria-selected")).toBe("true");
    expect(destination.element).toHaveFocus();
    expect(wrapper.get(`#${tabs[selected].panelId}`).classes()).toContain("fr-tabs__panel--selected");
  });

  it.each(["Tab", "Enter", " ", "Escape", "ArrowUp", "ArrowDown"])("ne prévient pas la touche non gérée %s", async (key) => {
    const wrapper = renderTabs();
    const source = wrapper.get<HTMLButtonElement>("#first-tab");
    source.element.focus();
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });

    source.element.dispatchEvent(event);
    await nextTick();

    expect(event.defaultPrevented).toBe(false);
    expect(source.attributes("aria-selected")).toBe("true");
  });

  it.each(["ArrowRight", "ArrowLeft", "Home", "End"])("laisse %s agir dans un champ du panneau", async (key) => {
    const wrapper = renderTabs();
    const field = wrapper.get<HTMLInputElement>("#first-panel-input");
    field.element.focus();
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });

    field.element.dispatchEvent(event);
    await nextTick();

    expect(event.defaultPrevented).toBe(false);
    expect(field.element).toHaveFocus();
    expect(wrapper.get("#first-tab").attributes("aria-selected")).toBe("true");
  });

  it.each([
    { name: "bord gauche", key: "Home", initial: 1, selected: 0, direction: "ltr", left: -74, width: 166, scrollLeft: 106, expected: 12 },
    {
      name: "bord droit",
      key: "ArrowRight",
      initial: 0,
      selected: 1,
      direction: "ltr",
      left: 250,
      width: 166,
      scrollLeft: 106,
      expected: 222,
    },
    {
      name: "bord gauche RTL",
      key: "Home",
      initial: 1,
      selected: 0,
      direction: "rtl",
      left: -74,
      width: 166,
      scrollLeft: -106,
      expected: -200,
    },
    {
      name: "bord droit RTL",
      key: "ArrowRight",
      initial: 0,
      selected: 1,
      direction: "rtl",
      left: 250,
      width: 166,
      scrollLeft: -200,
      expected: -84,
    },
    {
      name: "onglet déjà visible",
      key: "Home",
      initial: 1,
      selected: 0,
      direction: "ltr",
      left: 80,
      width: 166,
      scrollLeft: 106,
      expected: 106,
    },
    {
      name: "onglet couvrant les deux bords",
      key: "Home",
      initial: 1,
      selected: 0,
      direction: "ltr",
      left: -74,
      width: 450,
      scrollLeft: 106,
      expected: 106,
    },
  ])("révèle l'onglet au $name avec sa marge de focus sans déplacer les autres axes", async (scenario) => {
    const wrapper = renderTabs(scenario.initial);
    const source = wrapper.get<HTMLButtonElement>(`#${tabs[scenario.initial].tabId}`);
    const destination = wrapper.get<HTMLButtonElement>(`#${tabs[scenario.selected].tabId}`);
    const list = wrapper.get<HTMLUListElement>(".fr-tabs__list").element;
    list.style.direction = scenario.direction;
    destination.element.style.margin = "0 4px";
    Object.defineProperties(list, {
      clientWidth: { configurable: true, value: 288 },
      clientLeft: { configurable: true, value: 0 },
    });
    vi.spyOn(list, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 312, 288, 48));
    vi.spyOn(destination.element, "getBoundingClientRect").mockReturnValue(new DOMRect(scenario.left, 316, scenario.width, 40));
    list.scrollLeft = scenario.scrollLeft;
    list.scrollTop = 7;
    wrapper.element.scrollLeft = 19;
    wrapper.element.scrollTop = 73;
    document.documentElement.scrollTop = 91;
    source.element.focus();

    source.element.dispatchEvent(new KeyboardEvent("keydown", { key: scenario.key, bubbles: true, cancelable: true }));
    await nextTick();

    expect(destination.element).toHaveFocus();
    expect(destination.attributes("aria-selected")).toBe("true");
    expect(list.scrollLeft).toBe(scenario.expected);
    expect(list.scrollTop).toBe(7);
    expect(wrapper.element.scrollLeft).toBe(19);
    expect(wrapper.element.scrollTop).toBe(73);
    expect(document.documentElement.scrollTop).toBe(91);
  });
});

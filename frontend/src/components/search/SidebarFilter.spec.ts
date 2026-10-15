import { enableAutoUnmount, mount } from "@vue/test-utils";
import { ref } from "vue";
import SidebarFilter from "./SidebarFilter.vue";

const canListTechnologies = ref(false);
beforeEach(() => {
  canListTechnologies.value = false;
});

vi.mock("@/composables/use-application-search", () => ({
  DEFAULT_FILTERS: {},
  useApplicationSearch: () => ({ filters: ref({}), total: ref(45), resetFilters: vi.fn(), setFilter: vi.fn() }),
}));
vi.mock("@/composables/use-mdit-campaigns", () => ({ useMditCampaigns: () => ({ latestYear: ref(2026) }) }));
vi.mock("@/stores/statisticsStore", () => ({ useStatisticsStore: () => ({ totalApplications: 45, technicalDebtPointTotal: 0 }) }));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    user: { email: "synthetique@example.test" },
    get canListTechnologies() {
      return canListTechnologies.value;
    },
  }),
}));
vi.mock("vue-router", () => ({ useRoute: () => ({ path: "/recherche-application" }) }));

enableAutoUnmount(afterEach);

function renderSidebar() {
  return mount(SidebarFilter, {
    attachTo: document.body,
    global: {
      stubs: {
        VIcon: true,
        SavedFiltersPanel: true,
        BusinessDivisionSearch: true,
        CampaignFilter: true,
        ApplicationFilter: { template: '<label>Nom synthétique<input type="text" /></label>' },
        PriorityRestartFilter: true,
        StatusFilter: true,
        ActorFilter: true,
        HostingFilter: true,
        ComplianceFilter: true,
        RelationFilter: true,
        DataFilter: true,
        QualityFilter: true,
      },
    },
  });
}

describe("SidebarFilter — vrais accordéons DSFR", () => {
  it("expose l’état fermé de chacun des dix panneaux dès le premier rendu", () => {
    const wrapper = renderSidebar();
    const buttons = wrapper.findAll(".fr-accordion__btn");
    expect(buttons).toHaveLength(10);
    for (const button of buttons) {
      expect(button.attributes("aria-expanded")).toBe("false");
      const panel = wrapper.get(`[id="${button.attributes("aria-controls")}"]`);
      expect(panel.classes()).not.toContain("fr-collapse--expanded");
    }
  });

  it("synchronise ouverture, fermeture et réouverture sans refermer un autre filtre ni perdre le focus", async () => {
    const wrapper = renderSidebar();
    const general = wrapper.get<HTMLButtonElement>('[data-testid="sidebar-accordion-general"] button');
    const quality = wrapper.get('[data-testid="sidebar-accordion-quality"] button');
    general.element.focus();
    await general.trigger("click");
    expect(general.attributes("aria-expanded")).toBe("true");
    expect(general.element).toHaveFocus();
    await wrapper.get('[data-testid="sidebar-accordion-general"] input').setValue("Alpha");
    expect(general.attributes("aria-expanded")).toBe("true");
    await quality.trigger("click");
    expect(quality.attributes("aria-expanded")).toBe("true");
    expect(general.attributes("aria-expanded")).toBe("true");
    await general.trigger("click");
    expect(general.attributes("aria-expanded")).toBe("false");
    expect(quality.attributes("aria-expanded")).toBe("true");
    expect(general.element).toHaveFocus();
    await general.trigger("click");
    expect(general.attributes("aria-expanded")).toBe("true");
    expect(quality.attributes("aria-expanded")).toBe("true");
  });

  it("applique au filtre Technologies le même état DSFR sans refermer un autre panneau", async () => {
    canListTechnologies.value = true;
    const wrapper = renderSidebar();
    const technology = wrapper.get<HTMLButtonElement>('[data-testid="sidebar-accordion-technologies"] button');
    const quality = wrapper.get('[data-testid="sidebar-accordion-quality"] button');
    expect(technology.attributes("aria-expanded")).toBe("false");
    technology.element.focus();
    await technology.trigger("click");
    expect(technology.attributes("aria-expanded")).toBe("true");
    expect(technology.element).toHaveFocus();
    await quality.trigger("click");
    expect(quality.attributes("aria-expanded")).toBe("true");
    expect(technology.attributes("aria-expanded")).toBe("true");
    await technology.trigger("click");
    expect(technology.attributes("aria-expanded")).toBe("false");
    expect(quality.attributes("aria-expanded")).toBe("true");
  });
});

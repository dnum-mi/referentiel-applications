import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import type { Filters } from "@/composables/use-application-search";
import ActorFilter from "./ActorFilter.vue";
import ApplicationFilter from "./ApplicationFilter.vue";
import CampaignFilter from "./CampaignFilter.vue";
import ComplianceFilter from "./ComplianceFilter.vue";
import DataFilter from "./DataFilter.vue";
import HostingFilter from "./HostingFilter.vue";
import PriorityRestartFilter from "./PriorityRestartFilter.vue";
import QualityFilter from "./QualityFilter.vue";
import RelationFilter from "./RelationFilter.vue";
import StatusFilter from "./StatusFilter.vue";

const filters = ref<Partial<Filters>>({ tag: [], iqGte: 0, iqLte: 100 });
const setFilter = vi.fn((patch: Partial<Filters>) => Object.assign(filters.value, patch));
vi.mock("@/composables/use-application-search", () => ({ useApplicationSearch: () => ({ filters, setFilter }) }));
vi.mock("@/stores/actorTypeStore", () => ({ useActorTypeStore: () => ({ actorTypes: [], fetchAll: vi.fn() }) }));
vi.mock("@/stores/organizationStore", () => ({ useOrganizationStore: () => ({ find: vi.fn().mockResolvedValue([]) }) }));
vi.mock("@/stores/hostingStore", () => ({ useHostingStore: () => ({ getAllHostingOptions: vi.fn().mockResolvedValue([]) }) }));
vi.mock("@/composables/use-mdit-campaigns", () => ({
  useMditCampaigns: () => ({ campaigns: ref([{ year: 2026, label: "Campagne 2026" }]), loadActiveCampaigns: vi.fn() }),
}));
vi.mock("@/api/index", () => ({ default: {} }));
enableAutoUnmount(afterEach);

beforeEach(() => {
  filters.value = { tag: [], iqGte: 0, iqLte: 100 };
  setFilter.mockClear();
});

describe("Aides et champs de filtres", () => {
  it.each([
    { label: "Acteurs", component: ActorFilter },
    { label: "Application", component: ApplicationFilter },
    { label: "Campagne", component: CampaignFilter },
    { label: "Conformité", component: ComplianceFilter },
    { label: "Données", component: DataFilter },
    { label: "Hébergement", component: HostingFilter },
    { label: "Priorité", component: PriorityRestartFilter },
    { label: "Qualité", component: QualityFilter },
    { label: "Relations", component: RelationFilter },
    { label: "Statuts", component: StatusFilter },
  ])("nomme les aides de $label et conserve leur description DSFR", async ({ component }) => {
    const wrapper = mount(component, { attachTo: document.body, global: { stubs: { SuggestionsInput: true } } });
    await flushPromises();
    const helpButtons = wrapper.findAll(".fr-btn--tooltip");
    expect(helpButtons.length).toBeGreaterThan(0);
    for (const help of helpButtons) {
      expect(help.element).toHaveAccessibleName(/Afficher l’aide sur/);
      expect(help.element).toHaveAccessibleDescription();
    }
  });

  it("conserve le lien entre le champ de recherche et son aide, et la mise à jour du filtre", async () => {
    const wrapper = mount(ApplicationFilter, { attachTo: document.body });
    const input = wrapper.get('[data-testid="application-filter-label"]');
    expect(input.element).toHaveAccessibleDescription("Recherche les applications dont le nom contient le texte saisi.");
    await input.setValue("Exemple");
    expect(setFilter).toHaveBeenCalledWith({ search: "Exemple", page: 0 });
  });

  it("conserve les noms natifs des bornes IQ et leur comportement de correction", async () => {
    const wrapper = mount(QualityFilter);
    const min = wrapper.get('[data-testid="quality-filter-min"]');
    const max = wrapper.get('[data-testid="quality-filter-max"]');
    expect(min.element).toHaveAccessibleName("IQ minimum");
    expect(max.element).toHaveAccessibleName("IQ maximum");
    await min.setValue(40);
    await max.setValue(30);
    expect(setFilter).toHaveBeenLastCalledWith({ iqGte: 30, iqLte: 30, page: 0 });
  });
});

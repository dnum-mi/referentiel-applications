import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { DsfrCheckbox } from "@gouvminint/vue-dsfr";
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
import SuggestionsInput from "../SuggestionsInput.vue";
import TagSearchSelect from "../common/TagSearchSelect.vue";

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
      expect(help.element.closest("label, legend")).toBeNull();
      expect(help.attributes("type")).toBe("button");
    }
  });

  it("conserve le lien entre le champ de recherche et son aide, et la mise à jour du filtre", async () => {
    const wrapper = mount(ApplicationFilter, { attachTo: document.body });
    const input = wrapper.get('[data-testid="application-filter-label"]');
    expect(input.element).toHaveAccessibleName("Nom de l’application");
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

  it.each([
    {
      component: StatusFilter,
      selector: 'input[name="status-option-none"]',
      name: "Sans statut",
      description: "Affiche uniquement les applications sans statut renseigné.",
    },
    {
      component: HostingFilter,
      selector: 'input[name="hosting-missing-checkbox"]',
      name: "Sans hébergement",
      description: "Affiche uniquement les applications sans hébergement renseigné.",
    },
  ])("limite le nom de la case $name à son intitulé et conserve l’aide", async ({ component, selector, name, description }) => {
    const wrapper = mount(component, { attachTo: document.body });
    await flushPromises();
    expect(wrapper.get(selector).element).toHaveAccessibleName(name);
    expect(wrapper.get(selector).element).toHaveAccessibleDescription(description);
  });

  it.each([
    { component: ComplianceFilter, name: "Conformité" },
    { component: QualityFilter, name: "Indice de qualité" },
    { component: StatusFilter, name: "Statut de l'application" },
    { component: PriorityRestartFilter, name: "Priorité de redémarrage" },
    { component: TagSearchSelect, name: "Tags" },
  ])("limite le nom du groupe $name à son intitulé", async ({ component, name }) => {
    const wrapper = mount(component, { attachTo: document.body, props: { tooltipContent: "Aide à la recherche" } });
    await flushPromises();
    const fieldset = wrapper.findAll("fieldset").find((group) => group.find("legend").text() === name);
    if (!fieldset) throw new Error(`Groupe de filtres introuvable : ${name}`);
    expect(fieldset.element).toHaveAccessibleName(name);
    const help = fieldset.get(".fr-btn--tooltip");
    expect(fieldset.attributes("aria-describedby")?.split(/\s+/)).toContain(help.attributes("aria-describedby"));
    expect(fieldset.element).toHaveAccessibleDescription(/.+/);
    for (const help of wrapper.findAll(".fr-btn--tooltip")) expect(help.element.closest("label, legend")).toBeNull();
  });

  it("sépare le bouton d’aide du nom des champs à suggestions", () => {
    const wrapper = mount(SuggestionsInput, {
      attachTo: document.body,
      props: { label: "Direction métier", placeholder: "Rechercher", tooltipContent: "Recherche les directions métier." },
    });
    const input = wrapper.get('[role="combobox"]');
    expect(input.element).toHaveAccessibleName("Direction métier");
    expect(input.element).toHaveAccessibleDescription(/Recherche les directions métier\./);
    expect(wrapper.get(".fr-btn--tooltip").element.closest("label")).toBeNull();
  });

  it("conserve l’aide d’une case à cocher lorsque DSFR ajoute une erreur", () => {
    const wrapper = mount(
      {
        components: { DsfrCheckbox },
        template:
          '<div><span id="checkbox-help">Aide du filtre.</span><DsfrCheckbox label="Filtre" aria-describedby="checkbox-help" error-message="Erreur du filtre." /></div>',
      },
      { attachTo: document.body },
    );
    expect(wrapper.get('input[type="checkbox"]').element).toHaveAccessibleName("Filtre");
    expect(wrapper.get('input[type="checkbox"]').element).toHaveAccessibleDescription("Aide du filtre. Erreur du filtre.");
  });
});

import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { RelationType, type RelationDto } from "@/client/types.gen";
import SuggestionsInput from "../SuggestionsInput.vue";
import RelationModal from "./RelationModal.vue";

const { searchApplications } = vi.hoisted(() => ({ searchApplications: vi.fn() }));
vi.mock("@/composables/use-application-search", () => ({
  useApplicationSearch: () => ({ searchApplications }),
}));

const relation: RelationDto = {
  id: "relation-1",
  applicationSourceId: "source",
  applicationTargetId: "target",
  sourceApplication: { id: "source", label: "Application source" },
  targetApplication: { id: "target", label: "Application cible" },
  type: RelationType.IS_PART_OF,
  mediationServiceId: "mediation",
  mediationService: { id: "mediation", label: "Service de médiation" },
};

function renderModal(mode: "add" | "edit", applicationId = "source") {
  return mount(RelationModal, {
    shallow: true,
    props: {
      mode,
      applicationId,
      opened: true,
      title: mode === "add" ? "Ajouter une relation" : "Modifier une relation",
      relation: mode === "edit" ? relation : null,
    },
    global: {
      stubs: {
        DsfrModal: { template: '<div><slot /><slot name="footer" /></div>' },
        DsfrButton: { props: ["label"], template: "<button>{{ label }}</button>" },
        DsfrAlert: { props: ["description"], template: "<div>{{ description }}</div>" },
        DsfrTag: { props: ["label"], template: "<span>{{ label }}</span>" },
      },
    },
  });
}

afterEach(() => vi.clearAllMocks());

describe("RelationModal", () => {
  it("valide la cible et crée la relation avec son service de médiation", async () => {
    const wrapper = renderModal("add");
    await wrapper.get('[data-testid="relation-save-btn"]').trigger("click");
    expect(wrapper.emitted("addRelation")).toBeUndefined();
    expect(wrapper.get('[role="alert"]').isVisible()).toBe(true);

    const [targetInput, mediationInput] = wrapper.findAllComponents(SuggestionsInput);
    targetInput.vm.$emit("update:selectedValue", relation.targetApplication);
    mediationInput.vm.$emit("update:selectedValue", relation.mediationService);
    await wrapper.get('[data-testid="relation-save-btn"]').trigger("click");

    expect(wrapper.emitted("addRelation")).toEqual([
      [
        {
          applicationTargetId: "target",
          type: RelationType.IS_PART_OF,
          mediationServiceId: "mediation",
        },
      ],
    ]);
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
  });

  it("met à jour la cible depuis la fiche source et permet d'effacer la médiation", async () => {
    const wrapper = renderModal("edit");
    const [targetInput, mediationInput] = wrapper.findAllComponents(SuggestionsInput);
    targetInput.vm.$emit("update:selectedValue", { id: "new-target", label: "Nouvelle cible" });
    mediationInput.vm.$emit("update:selectedValue", undefined);
    await wrapper.get('[data-testid="edit-relation-save-btn"]').trigger("click");

    expect(wrapper.emitted("updateRelation")).toEqual([
      [
        {
          id: "relation-1",
          applicationSourceId: "source",
          applicationTargetId: "new-target",
          type: RelationType.IS_PART_OF,
          mediationServiceId: null,
        },
      ],
    ]);
    wrapper.unmount();
  });

  it("garde la source en lecture seule et le sens de stockage depuis la fiche cible", async () => {
    const wrapper = renderModal("edit", "target");
    expect(wrapper.get('[data-testid="relation-linked-application"]').text()).toContain("Application source");
    expect(wrapper.findAllComponents(SuggestionsInput)).toHaveLength(1);
    await wrapper.get('[data-testid="edit-relation-save-btn"]').trigger("click");

    expect(wrapper.emitted("updateRelation")).toEqual([
      [
        {
          id: "relation-1",
          applicationSourceId: "source",
          applicationTargetId: "target",
          type: RelationType.IS_PART_OF,
          mediationServiceId: "mediation",
        },
      ],
    ]);
    wrapper.unmount();
  });

  it("réinitialise la sélection et l'erreur quand la modale d'ajout est rouverte", async () => {
    const wrapper = renderModal("add");
    wrapper.findAllComponents(SuggestionsInput)[0].vm.$emit("update:selectedValue", relation.targetApplication);
    await wrapper.setProps({ opened: false });
    await wrapper.setProps({ opened: true });
    expect(wrapper.get('[role="alert"]').isVisible()).toBe(false);
    await wrapper.get('[data-testid="relation-save-btn"]').trigger("click");
    expect(wrapper.emitted("addRelation")).toBeUndefined();
    expect(wrapper.get('[role="alert"]').text()).toBe("L'application cible est requise.");
    await wrapper.setProps({ opened: false });
    await wrapper.setProps({ opened: true });
    expect(wrapper.get('[role="alert"]').isVisible()).toBe(false);
    wrapper.unmount();
  });

  it("neutralise tous les filtres de relations dans les deux champs de recherche", async () => {
    searchApplications.mockResolvedValue({ results: [relation.targetApplication] });
    const wrapper = renderModal("add");
    for (const input of wrapper.findAllComponents(SuggestionsInput)) {
      const results = await input.props("searchDataFunction")!("application");
      expect(results).toEqual([relation.targetApplication]);
      expect(searchApplications).toHaveBeenLastCalledWith(
        {
          search: "application",
          pageSize: 10,
          relationAppId: undefined,
          is_part_of: "NEUTRAL",
          is_data_user_of: "NEUTRAL",
          is_service_user_of: "NEUTRAL",
          in_replacement_of: "NEUTRAL",
          use_sso_of: "NEUTRAL",
          is_correlated_with: "NEUTRAL",
          is_mediation_service: "NEUTRAL",
        },
        false,
      );
    }
    await nextTick();
    wrapper.unmount();
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import TagActions from "./TagActions.vue";
import BusinessDivisionActions from "./BusinessDivisionActions.vue";
import LabelSourceActions from "./LabelSourceActions.vue";
import MditCampaignActions from "./MditCampaignActions.vue";

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }),
}));
const global = {
  stubs: {
    DsfrModal: {
      props: { opened: Boolean },
      template: '<div v-if="opened" role="dialog"><slot /><slot name="footer" /></div>',
    },
  },
};
const cases = [
  {
    name: "tag",
    createLabel: "Créer un tag",
    create: () => render(TagActions, { global }),
    existing: () => render(TagActions, { props: { tag: { id: "tag-1", name: "test", createdAt: "2026-10-12" } }, global }),
    deleteId: "admin-tag-delete-btn",
    confirmId: "admin-delete-confirm-btn",
    confirmName: "Supprimer le tag",
  },
  {
    name: "direction métier",
    createLabel: "Créer une direction métier",
    create: () => render(BusinessDivisionActions, { global }),
    existing: () => render(BusinessDivisionActions, { props: { businessDivision: { id: "division-1", label: "Test" } }, global }),
    deleteId: "admin-business-division-delete-btn",
    confirmId: "admin-business-division-delete-confirm-btn",
    confirmName: "Supprimer la direction métier",
  },
  {
    name: "source",
    createLabel: "Créer une source",
    create: () => render(LabelSourceActions, { global }),
    existing: () => render(LabelSourceActions, { props: { labelSource: { id: "source-1", source: "Test" } }, global }),
    deleteId: "admin-label-source-delete-btn",
    confirmId: "admin-delete-confirm-btn",
    confirmName: "Supprimer la source",
  },
  {
    name: "campagne",
    createLabel: "Créer une campagne",
    create: () => render(MditCampaignActions, { global }),
    existing: () => render(MditCampaignActions, { props: { campaign: { id: "campaign-1", year: 2026 } }, global }),
    deleteId: "admin-campaign-delete-btn",
    confirmId: "admin-campaign-delete-confirm-btn",
    confirmName: "Supprimer la campagne",
  },
];
afterEach(cleanup);

describe.each(cases)("nom accessible des actions : $name", ({ createLabel, create, existing, deleteId, confirmId, confirmName }) => {
  it("conserve la totalité du texte visible de la commande de création dans son nom", () => {
    create();
    expect(screen.getByRole("button", { name: createLabel })).toHaveTextContent(createLabel);
  });

  it("nomme la confirmation avec le texte visible Supprimer et le contexte de l’action", async () => {
    existing();
    await fireEvent.click(screen.getByTestId(deleteId));
    const confirm = screen.getByTestId(confirmId);
    expect(confirm).toHaveTextContent("Supprimer");
    expect(confirm).toHaveAccessibleName(confirmName);
  });
});

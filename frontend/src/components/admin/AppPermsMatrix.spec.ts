import { mount } from "@vue/test-utils";
import type { AppPermsDto } from "@/client/types.gen";
import AppPermsMatrix from "./AppPermsMatrix.vue";

vi.mock("@/stores/actorTypeStore", () => ({
  useActorTypeStore: () => ({ actorTypes: [{ id: "moa", label: "Maîtrise d’ouvrage" }], fetchAll: vi.fn() }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addSuccessMessage: vi.fn(), addErrorMessage: vi.fn() }) }));
vi.mock("@/api/index", () => ({ default: {} }));

const permissions: AppPermsDto = {
  actorTypeId: "moa",
  AppRead: true,
  AppWrite: false,
  AppWritePriority: true,
  ActorRead: true,
  ActorWrite: false,
  ComplianceRead: true,
  ComplianceWrite: false,
  HostingRead: true,
  HostingWrite: false,
  MetadataRead: true,
  DataRead: true,
  DataWrite: false,
  TechnologyRead: true,
  TechnologyWrite: false,
  RelationRead: true,
  RelationWrite: false,
  LinkRead: true,
  LinkWrite: false,
  ReportRead: true,
  ReportPost: false,
  ReportManage: false,
};

it("identifie le type d’acteur comme en-tête de ligne et conserve les noms visibles des actions", () => {
  const wrapper = mount(AppPermsMatrix, { props: { appPermsMatrix: [permissions] }, global: { stubs: { AppPermsMatrixHistory: true } } });
  const row = wrapper.get('[data-testid="app-perms-row-moa"]');
  expect(row.get("th").attributes("scope")).toBe("row");
  expect(row.get("th").text()).toBe("Maîtrise d’ouvrage");
  const save = wrapper.get('[data-testid="app-perms-save-btn"]');
  expect(save.text()).toBe("Enregistrer les modifications");
  expect(save.attributes("aria-label")).toBeUndefined();
  expect(wrapper.find('button[aria-label="Recharger la matrice des permissions"]').exists()).toBe(false);
  expect(row.get('[id="moa-PriorityRestart"]').attributes("aria-label")).toContain("Maîtrise d’ouvrage");
  wrapper.unmount();
});

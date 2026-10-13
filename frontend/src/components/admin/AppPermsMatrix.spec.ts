import { enableAutoUnmount, mount } from "@vue/test-utils";
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

enableAutoUnmount(afterEach);

function mountMatrix(isSaving = false) {
  return mount(AppPermsMatrix, {
    props: { appPermsMatrix: [{ ...permissions }], isSaving },
    global: { stubs: { AppPermsMatrixHistory: true } },
  });
}

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
});

it("garde les actions focalisables mais refuse sauvegarde et rechargement pendant une requête", async () => {
  const wrapper = mountMatrix(true);
  const save = wrapper.get('[data-testid="app-perms-save-btn"]');
  const reload = wrapper.get('[data-testid="app-perms-reload-btn"]');
  expect(save.attributes("aria-disabled")).toBe("true");
  expect(save.attributes("aria-busy")).toBe("true");
  expect(save.attributes("disabled")).toBeUndefined();
  await save.trigger("click");
  await reload.trigger("click");
  expect(wrapper.emitted("update:appPermsMatrix")).toBeUndefined();
  expect(wrapper.emitted("reload")).toBeUndefined();

  await wrapper.setProps({ isSaving: false });
  await wrapper.get('[data-testid="app-perms-select-moa-Link"]').trigger("click");
  await save.trigger("click");
  expect(wrapper.emitted("update:appPermsMatrix")?.[0]).toEqual([[{ ...permissions, LinkWrite: true }]]);
  expect(permissions.LinkWrite).toBe(false);
});

it("intègre les valeurs canoniques et les nouvelles lignes après un enregistrement sans nouvelle saisie", async () => {
  const wrapper = mountMatrix();
  const link = wrapper.get('[data-testid="app-perms-select-moa-Link"]');
  await link.trigger("click");
  await wrapper.get('[data-testid="app-perms-save-btn"]').trigger("click");
  await wrapper.setProps({ isSaving: true });
  await wrapper.setProps({
    appPermsMatrix: [
      { ...permissions, DataWrite: true },
      { ...permissions, actorTypeId: "new-actor" },
    ],
    isSaving: false,
  });
  expect(link.attributes("data-state")).toBe("Read");
  expect(wrapper.get('[data-testid="app-perms-select-moa-Data"]').attributes("data-state")).toBe("Write");
  expect(wrapper.get('[data-testid="app-perms-row-new-actor"]').get("th").text()).toBe("new-actor");
});

it("conserve les changements effectués après la soumission en intégrant les autres valeurs serveur", async () => {
  const wrapper = mountMatrix();
  const link = wrapper.get('[data-testid="app-perms-select-moa-Link"]');
  await link.trigger("click");
  await wrapper.get('[data-testid="app-perms-save-btn"]').trigger("click");
  await wrapper.setProps({ isSaving: true });
  await link.trigger("click");
  expect(link.attributes("data-state")).toBe("none");
  const persisted = [{ ...permissions, LinkWrite: true, DataWrite: true }];
  await wrapper.setProps({ appPermsMatrix: persisted, isSaving: false });
  expect(link.attributes("data-state")).toBe("none");
  expect(wrapper.get('[data-testid="app-perms-select-moa-Data"]').attributes("data-state")).toBe("Write");
  expect(persisted[0].LinkRead).toBe(true);
  expect(persisted[0].LinkWrite).toBe(true);
  expect(wrapper.emitted("update:appPermsMatrix")?.[0]).toEqual([[{ ...permissions, LinkWrite: true }]]);
});

it("garde aussi le brouillon lors d’une relecture indépendante après refus d’enregistrement", async () => {
  const wrapper = mountMatrix();
  const link = wrapper.get('[data-testid="app-perms-select-moa-Link"]');
  await link.trigger("click");
  await wrapper.get('[data-testid="app-perms-save-btn"]').trigger("click");
  await wrapper.setProps({ isSaving: true });
  await wrapper.setProps({ isSaving: false });
  await wrapper.setProps({ appPermsMatrix: [{ ...permissions, DataWrite: true }] });
  expect(link.attributes("data-state")).toBe("Write");
  expect(wrapper.get('[data-testid="app-perms-select-moa-Data"]').attributes("data-state")).toBe("Write");
});

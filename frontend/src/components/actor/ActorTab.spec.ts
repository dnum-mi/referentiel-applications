import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { ActorDto } from "@/client/types.gen";
import type { APP_PERMISSIONS, ApplicationWithPerms } from "@/models/Application";
import ActorForm from "./ActorForm.vue";
import ActorTab from "./ActorTab.vue";

const { findActors, updateActor, createActor, toastError } = vi.hoisted(() => ({
  findActors: vi.fn(),
  updateActor: vi.fn(),
  createActor: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/api/index", () => ({
  default: {
    applicationActorsControllerFindAll: findActors,
    applicationActorsControllerUpdated: updateActor,
    applicationActorsControllerCreate: createActor,
  },
}));
vi.mock("@/stores/actorTypeStore", () => ({ useActorTypeStore: () => ({ actorTypes: [{ id: "moa", label: "MOA" }], fetchAll: vi.fn() }) }));
vi.mock("@/stores/organizationStore", () => ({ useOrganizationStore: () => ({ organizations: {} }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: toastError, addSuccessMessage: vi.fn() }) }));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    hasPermissions: (needed: string[], granted: string[]) => needed.some((permission) => granted.includes(permission)),
  }),
}));
enableAutoUnmount(afterEach);

const actors: ActorDto[] = [
  { id: "actor-1", actorTypeId: "moa", firstname: "Camille", lastname: "Martin", email: "camille@example.fr" },
  { id: "actor-2", actorTypeId: "moa", email: "equipe@example.fr", isGroup: true },
];
const application: ApplicationWithPerms = {
  id: "app-1",
  label: "Application",
  logo: null,
  shortName: null,
  description: "Description",
  targetPopulations: [],
  purposes: [],
  quality: null,
  myPerms: new Set<APP_PERMISSIONS>(["ActorWrite"]),
};

async function renderTab() {
  const wrapper = mount(ActorTab, {
    attachTo: document.body,
    props: { application },
    global: {
      stubs: {
        RefAppTable: {
          props: ["items", "columns"],
          template:
            '<table><thead><tr><th v-for="column in columns" :key="column.field" :data-field="column.field">{{ column.header }}<slot v-if="column.field === \'Groupe\'" name="header-Groupe" /></th></tr></thead><tbody><tr v-for="item in items" :key="item.id"><td><slot name="body-Sélection" :data="item" /></td><td><slot name="body-Actions" :data="item" /></td></tr></tbody></table>',
        },
        ActorForm: { props: ["errorMessage"], emits: ["submit"], template: '<div>Formulaire<p role="alert">{{ errorMessage }}</p></div>' },
        DsfrModal: { props: ["opened"], template: '<div v-if="opened"><slot /></div>' },
        DeleteConfirmationModal: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  findActors.mockReset().mockResolvedValue({ data: { results: actors } });
  updateActor.mockReset().mockResolvedValue({ response: { ok: true } });
  createActor.mockReset();
  toastError.mockReset();
});

describe("ActorTab — sélection et focus", () => {
  it("conserve le titre Rattaché(e) et ouvre l’aide depuis une commande explicite, fermable avec Échap", async () => {
    const wrapper = await renderTab();
    const button = wrapper.get('button[aria-label="Afficher l’aide sur le rattachement des acteurs"]');
    expect(wrapper.get('[data-field="Groupe"]').text()).toContain("Rattaché(e)");
    expect(button.element).toHaveAccessibleName("Afficher l’aide sur le rattachement des acteurs");
    const tooltipId = button.attributes("aria-describedby");
    const tooltip = wrapper.get(`[id="${tooltipId}"]`);
    expect(tooltip.classes()).not.toContain("fr-tooltip--shown");
    await button.trigger("click");
    expect(tooltip.classes()).toContain("fr-tooltip--shown");
    expect(tooltip.text()).toContain("Établir le lien entre une personne physique et une boîte e-mail fonctionnelle");
    (button.element as HTMLButtonElement).focus();
    document.documentElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushPromises();
    expect(tooltip.classes()).not.toContain("fr-tooltip--shown");
    expect(document.activeElement).toBe(button.element);
  });

  it("nomme individuellement la sélection et la modification de chaque acteur", async () => {
    const wrapper = await renderTab();
    const selection = wrapper.get('[data-testid="actor-row-select-actor-1"]');
    expect(selection.element).toHaveAccessibleName("Sélectionner Camille Martin (camille@example.fr) — MOA");
    expect(wrapper.get('[data-testid="actor-row-select-actor-2"]').element).toHaveAccessibleName("Sélectionner equipe@example.fr — MOA");
    expect(wrapper.findAll('[data-testid="actor-edit-btn"]')[0].element).toHaveAccessibleName(
      "Modifier Camille Martin (camille@example.fr)",
    );
    await selection.setValue(true);
    expect(wrapper.get('[data-testid="actor-bulk-delete-btn"]').element).not.toBeDisabled();
  });

  it("rend le focus au bouton recréé après la sauvegarde d'un acteur", async () => {
    const wrapper = await renderTab();
    const original = wrapper.findAll('[data-testid="actor-edit-btn"]')[0];
    await original.trigger("click");
    wrapper.findComponent(ActorForm).vm.$emit("submit", actors[0]);
    await flushPromises();
    expect(updateActor).toHaveBeenCalledOnce();
    expect(wrapper.findAll('[data-testid="actor-edit-btn"]')[0].element).toHaveFocus();
  });

  it("conserve le formulaire ouvert si l'API refuse la création", async () => {
    createActor.mockResolvedValue({ response: { ok: false } });
    const wrapper = await renderTab();
    await wrapper.get('[data-testid="actor-add-btn"]').trigger("click");
    wrapper.findComponent(ActorForm).vm.$emit("submit", { actorTypeId: "moa", email: "contact@example.fr" });
    await flushPromises();
    expect(wrapper.findComponent(ActorForm).exists()).toBe(true);
    expect(wrapper.findComponent(ActorForm).props("errorMessage")).toBe(
      "Erreur lors de la sauvegarde de l’acteur. Votre saisie est conservée.",
    );
    expect(wrapper.get('[role="alert"]').text()).toBe("Erreur lors de la sauvegarde de l’acteur. Votre saisie est conservée.");
  });
});

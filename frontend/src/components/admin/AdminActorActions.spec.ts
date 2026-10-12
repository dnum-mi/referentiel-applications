import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { ActorDto, ActorTypeDto } from "@/client/types.gen";
import AdminActorActions from "./AdminActorActions.vue";

const { updateActor, updateAll, findApplications } = vi.hoisted(() => ({
  updateActor: vi.fn(),
  updateAll: vi.fn(),
  findApplications: vi.fn(),
}));
vi.mock("@/api", () => ({
  default: {
    actorControllerUpdateActor: updateActor,
    actorControllerUpdateAllByEmail: updateAll,
    actorControllerFindApplicationsByEmail: findApplications,
  },
}));
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: () => ({ getById: vi.fn().mockResolvedValue({ id: "org-1", path: "MI/DNUM" }) }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
afterEach(() => vi.restoreAllMocks());
const actor: ActorDto = {
  id: "actor-1",
  applicationId: "app-1",
  actorTypeId: "type-1",
  organizationId: "org-1",
  email: "camille@example.test",
  firstname: "Camille",
  lastname: "Initial",
  isGroup: false,
};
const actorTypes: ActorTypeDto[] = [{ id: "type-1", code: "MOA", label: "Maîtrise d’ouvrage", isDefault: false }];

async function renderActions() {
  const wrapper = mount(AdminActorActions, {
    attachTo: document.body,
    props: { actor, actorTypes },
    global: {
      stubs: {
        DsfrModal: {
          props: ["opened"],
          template: '<div v-if="opened" role="dialog"><button class="fr-btn--close">Fermer</button><slot /><slot name="footer" /></div>',
        },
        OrganizationSearchSelect: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<label>Organisation<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="org-1">MI/DNUM</option></select></label>',
        },
        DsfrMultiselect: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}
beforeEach(() => {
  updateActor.mockReset().mockResolvedValue({ response: { ok: false } });
  updateAll.mockReset().mockResolvedValue({ response: { ok: false } });
  findApplications.mockReset().mockResolvedValue({ response: { ok: true }, data: [{ id: "app-1", label: "Application" }] });
});

describe("AdminActorActions — confirmation personnelle", () => {
  it("refuse puis confirme l’acteur individuel et conserve la saisie si l’API échoue", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const wrapper = await renderActions();
    await wrapper.get('[data-testid="admin-actor-edit-btn"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="actor-lastname-input"]').setValue("Nom modifié");
    await wrapper.get('[data-testid="actor-submit-btn"]').trigger("click");
    expect(updateActor).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Camille Nom modifié"));
    await wrapper.get('[data-testid="actor-submit-btn"]').trigger("click");
    await flushPromises();
    expect(updateActor).toHaveBeenCalledOnce();
    expect(wrapper.get('[data-testid="actor-form-error"]').text()).toContain("Erreur lors de la mise à jour de l'acteur");
    expect(wrapper.get('[data-testid="actor-lastname-input"]').element).toHaveValue("Nom modifié");
  });

  it("ne modifie aucun acteur par email avant accord et garde la fenêtre et les valeurs après un refus API", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const wrapper = await renderActions();
    await wrapper.get('[data-testid="admin-actor-edit-all-btn"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="admin-actor-all-lastname-input"]').setValue("Nom modifié");
    await wrapper.get('[data-testid="admin-actor-save-all-btn"]').trigger("click");
    expect(updateAll).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Camille Nom modifié"));
    await wrapper.get('[data-testid="admin-actor-all-lastname-input"]').setValue("Nom après refus");
    await wrapper.get('[data-testid="admin-actor-save-all-btn"]').trigger("click");
    await flushPromises();
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("Camille Nom après refus"));
    expect(updateAll).toHaveBeenCalledOnce();
    expect(updateAll).toHaveBeenCalledWith({ body: expect.objectContaining({ targetEmail: actor.email, lastname: "Nom après refus" }) });
    expect(wrapper.get('[data-testid="admin-actor-all-error"]').text()).toContain("Erreur lors de la mise à jour des acteurs");
    expect(wrapper.get('[data-testid="admin-actor-all-lastname-input"]').element).toHaveValue("Nom après refus");
    expect(wrapper.find('[data-testid="admin-edit-all-actor-modal"]').exists()).toBe(true);
  });
});

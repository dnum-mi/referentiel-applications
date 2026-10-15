import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { ActorDto, ActorTypeDto } from "@/client/types.gen";
import AdminActorActions from "./AdminActorActions.vue";

const { updateActor, updateAll, findApplications, deleteActor, deleteAll, syncMaia } = vi.hoisted(() => ({
  updateActor: vi.fn(),
  updateAll: vi.fn(),
  findApplications: vi.fn(),
  deleteActor: vi.fn(),
  deleteAll: vi.fn(),
  syncMaia: vi.fn(),
}));
vi.mock("@/api", () => ({
  default: {
    actorControllerUpdateActor: updateActor,
    actorControllerUpdateAllByEmail: updateAll,
    actorControllerFindApplicationsByEmail: findApplications,
    actorControllerDeleteActor: deleteActor,
    actorControllerDeleteAllByEmail: deleteAll,
    userControllerSyncOrganizationFromMaiaByEmail: syncMaia,
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
  deleteActor.mockReset();
  deleteAll.mockReset();
  syncMaia.mockReset();
});

describe("AdminActorActions — confirmation personnelle", () => {
  it("annonce un échec de recherche et retire la sélection de la précédente ouverture", async () => {
    const wrapper = await renderActions();
    await wrapper.get('[data-testid="admin-actor-delete-all-btn"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="admin-actor-delete-all-confirm-btn"]').element).not.toBeDisabled();
    const cancel = wrapper.findAll("button").find((button) => button.text() === "Annuler");
    expect(cancel).toBeDefined();
    await cancel?.trigger("click");
    findApplications.mockResolvedValueOnce({ response: { ok: false }, error: { message: "Refus" } });
    await wrapper.get('[data-testid="admin-actor-delete-all-btn"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="admin-actor-delete-all-error"]').text()).toContain(
      "Impossible de charger les applications concernées",
    );
    expect(wrapper.get('[data-testid="admin-actor-delete-all-confirm-btn"]').element).toBeDisabled();
    expect(deleteAll).not.toHaveBeenCalled();
  });

  it("garde la saisie et le focus après refus MAIA et annonce le résultat du réessai dans la fenêtre", async () => {
    syncMaia.mockResolvedValueOnce({ response: { ok: false } }).mockResolvedValueOnce({
      response: { ok: true },
      data: { firstName: "Camille", lastName: "Synchronisé", organizationId: null },
    });
    const wrapper = await renderActions();
    await wrapper.get('[data-testid="admin-actor-edit-all-btn"]').trigger("click");
    await flushPromises();
    const field = wrapper.get('[data-testid="admin-actor-all-lastname-input"]');
    await field.setValue("Brouillon");
    const button = wrapper.get<HTMLButtonElement>('[data-testid="admin-actor-all-sync-maia-btn"]');
    button.element.focus();
    await button.trigger("click");
    await flushPromises();
    expect(field.element).toHaveValue("Brouillon");
    expect(wrapper.get('[data-testid="admin-actor-all-error"]').text()).toContain("Erreur lors de la synchronisation MAIA");
    expect(button.element).toHaveFocus();
    await button.trigger("click");
    await flushPromises();
    expect(field.element).toHaveValue("Synchronisé");
    expect(wrapper.get('[data-testid="admin-actor-all-status"]').text()).toBe("Synchronisation depuis MAIA effectuée");
    expect(wrapper.get('[data-testid="admin-actor-all-error"]').text()).toBe("");
  });
  it.each([false, true])("conserve le dialogue et le focus après refus de suppression, par email = %s", async (all) => {
    let rejectRequest!: (response: { response: { ok: boolean } }) => void;
    const request = new Promise<{ response: { ok: boolean } }>((resolve) => {
      rejectRequest = resolve;
    });
    const apiDelete = all ? deleteAll : deleteActor;
    apiDelete.mockReturnValueOnce(request);
    const wrapper = await renderActions();
    await wrapper.get(`[data-testid="${all ? "admin-actor-delete-all-btn" : "admin-actor-delete-btn"}"]`).trigger("click");
    await flushPromises();
    const button = wrapper.get<HTMLButtonElement>(
      `[data-testid="${all ? "admin-actor-delete-all-confirm-btn" : "admin-actor-delete-confirm-btn"}"]`,
    );
    button.element.focus();
    await button.trigger("click");
    expect(button.element).not.toBeDisabled();
    expect(button.attributes("aria-disabled")).toBe("true");
    await button.trigger("click");
    expect(apiDelete).toHaveBeenCalledOnce();
    rejectRequest({ response: { ok: false } });
    await flushPromises();
    expect(wrapper.get(`[data-testid="${all ? "admin-actor-delete-all-error" : "admin-actor-delete-error"}"]`).text()).toContain(
      "Erreur lors de la suppression",
    );
    expect(button.element).toHaveFocus();
    expect(button.attributes("aria-disabled")).toBe("false");
    apiDelete.mockResolvedValueOnce({ response: { ok: true }, data: { count: 1 } });
    await button.trigger("click");
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(wrapper.emitted("updated")).toHaveLength(1);
  });
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

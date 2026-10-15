import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { ActorTypeDto, CreateActorDto } from "@/client/types.gen";
import ActorForm from "./ActorForm.vue";

vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: () => ({ getById: vi.fn().mockResolvedValue({ id: "org-1", path: "MI/DNUM" }) }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
afterEach(() => vi.restoreAllMocks());

const actorTypes: ActorTypeDto[] = [{ id: "type-1", code: "MOA", label: "Maîtrise d’ouvrage", isDefault: false }];
const initialData: CreateActorDto = {
  actorTypeId: "type-1",
  organizationId: "org-1",
  email: "camille@example.test",
  firstname: "Camille",
  lastname: "Initial",
};

async function renderForm(editing = true) {
  const wrapper = mount(ActorForm, {
    attachTo: document.body,
    props: {
      application: {
        id: "app-1",
        label: "Application",
        logo: null,
        shortName: null,
        description: "Description",
        targetPopulations: [],
        purposes: [],
        quality: null,
      },
      actorTypes,
      ...(editing ? { initialData } : {}),
    },
    global: {
      stubs: {
        OrganizationSearchSelect: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<label>Organisation<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">Sélectionner</option><option value="org-1">MI/DNUM</option></select></label>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("ActorForm — confirmation des modifications personnelles", () => {
  it("annule l’envoi si la confirmation est refusée, conserve la saisie puis confirme les valeurs courantes", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const wrapper = await renderForm();
    await wrapper.get('[data-testid="actor-lastname-input"]').setValue("Après modification");
    await wrapper.get('[data-testid="actor-submit-btn"]').trigger("click");
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Camille Après modification"));
    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.get('[data-testid="actor-lastname-input"]').element).toHaveValue("Après modification");

    await wrapper.get('[data-testid="actor-lastname-input"]').setValue("Après refus");
    await wrapper.get('[data-testid="actor-submit-btn"]').trigger("click");
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("Camille Après refus"));
    expect(wrapper.emitted("submit")).toEqual([[expect.objectContaining({ lastname: "Après refus", email: initialData.email })]]);
  });

  it("conserve l’annulation du formulaire sans confirmer ni envoyer", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const wrapper = await renderForm();
    await wrapper.get('[data-testid="actor-cancel-btn"]').trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("envoie une création ordinaire sans ajouter de confirmation de modification", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = await renderForm(false);
    await wrapper.get('[data-testid="actor-type-select"]').setValue("type-1");
    await wrapper.get("select:not([data-testid])").setValue("org-1");
    await wrapper.get('[data-testid="actor-email-input"]').setValue("nouvel-acteur@example.test");
    await wrapper.get('[data-testid="actor-submit-btn"]').trigger("click");
    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect(confirm).not.toHaveBeenCalled();
  });
});

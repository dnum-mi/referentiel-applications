import { enableAutoUnmount, mount } from "@vue/test-utils";
import { reactive } from "vue";
import type { CreateActorDto, OrganizationDto } from "@/client/types.gen";
import ApplicationMoaStep from "./ApplicationMoaStep.vue";
import ApplicationMoeStep from "./ApplicationMoeStep.vue";
import type { ApplicationFormErrors } from "./application-form.types";

const { find } = vi.hoisted(() => ({ find: vi.fn().mockResolvedValue([]) }));
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: () => ({ find, organizations: {} }),
}));

enableAutoUnmount(afterEach);

const organization: OrganizationDto = {
  id: "org-1",
  path: "Direction / Service",
  url: null,
  sigle: null,
  parentId: null,
  businessDivisionId: null,
};

describe.each([
  { role: "moa", component: ApplicationMoaStep, step: 3 },
  { role: "moe", component: ApplicationMoeStep, step: 4 },
] as const)("Étape $role", ({ role, component, step }) => {
  function renderStep(errors: ApplicationFormErrors = {}) {
    const model = reactive<CreateActorDto>({
      actorTypeId: `type-${role}`,
      email: "contact@example.fr",
      firstname: "Camille",
      lastname: "Martin",
      organizationId: organization.id,
      isGroup: false,
    });
    const wrapper = mount(component, {
      attachTo: document.body,
      props: { modelValue: model, errors, initialOrganization: organization, isSyncing: false },
    });
    return { wrapper, model };
  }

  it("relie les erreurs à chaque champ et transmet le focus à travers l'étape", async () => {
    const errors: ApplicationFormErrors = {};
    for (const field of ["email", "organizationId", "firstname", "lastname"] as const) {
      errors[`${role}.${field}`] = `Erreur ${field}`;
    }
    const { wrapper } = renderStep(errors);
    expect(wrapper.get(`[data-testid="application-step-title-${step}"]`).text()).toContain(`Étape ${step} sur 4`);

    for (const field of ["email", "firstname", "lastname"] as const) {
      const input = wrapper.get(`[data-testid="application-${role}-${field}"]`);
      const errorId = `application-${role}-${field}-error`;
      expect(input.element).toHaveAttribute("aria-describedby", errorId);
      expect(input.element).toHaveAttribute("aria-invalid", "true");
      expect(wrapper.get(`#${errorId}`).text()).toBe(`Erreur ${field}`);
      await wrapper.vm.focusField(`${role}.${field}`);
      expect(input.element).toHaveFocus();
    }

    const search = wrapper.get(`#application-${role}-organization-search`);
    const select = wrapper.get(`#application-${role}-organization-select`);
    for (const input of [search, select]) {
      expect(input.element).toHaveAttribute("aria-describedby", `application-${role}-organization-error`);
      expect(input.element).toHaveAttribute("aria-invalid", "true");
    }
    expect(wrapper.get(`#application-${role}-organization-error`).text()).toBe("Erreur organizationId");
    await wrapper.vm.focusField(`${role}.organizationId`);
    expect(select.element).toHaveFocus();

    await wrapper.setProps({ errors: {} });
    for (const input of [search, select, wrapper.get(`[data-testid="application-${role}-email"]`)]) {
      expect(input.element).not.toHaveAttribute("aria-describedby");
      expect(input.element).not.toHaveAttribute("aria-invalid");
    }
  });

  it("conserve les identifiants de la checkbox et les noms masqués d'une entité", async () => {
    const { wrapper, model } = renderStep();
    const checkbox = wrapper.get(`input[name="${role}IsGroup"]`);
    await checkbox.setValue(true);
    expect(model.isGroup).toBe(true);
    expect(wrapper.find(`[data-testid="application-${role}-firstname"]`).exists()).toBe(false);
    expect(wrapper.find(`[data-testid="application-${role}-lastname"]`).exists()).toBe(false);
    expect(model.firstname).toBe("Camille");
    expect(model.lastname).toBe("Martin");

    await checkbox.setValue(false);
    expect(wrapper.get(`[data-testid="application-${role}-firstname"]`).element).toHaveValue("Camille");
    expect(wrapper.get(`[data-testid="application-${role}-lastname"]`).element).toHaveValue("Martin");
    expect(model.actorTypeId).toBe(`type-${role}`);
  });

  it("émet la synchronisation MAIA et bloque le bouton pendant la requête", async () => {
    const { wrapper } = renderStep();
    const button = wrapper.get(`[data-testid="application-${role}-sync-maia-btn"]`);
    await button.trigger("click");
    expect(wrapper.emitted("sync")).toEqual([[]]);
    await wrapper.setProps({ isSyncing: true });
    expect(button.element).toBeDisabled();
    await wrapper.setProps({ isSyncing: false });
    await wrapper.get(`[data-testid="application-${role}-email"]`).setValue("");
    expect(button.element).toBeDisabled();
  });
});

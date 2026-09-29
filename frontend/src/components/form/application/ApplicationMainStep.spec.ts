import { enableAutoUnmount, mount } from "@vue/test-utils";
import { reactive } from "vue";
import ApplicationMainStep from "./ApplicationMainStep.vue";
import type { ApplicationFormErrors, ApplicationFormState } from "./application-form.types";

enableAutoUnmount(afterEach);

function renderMain(errors: ApplicationFormErrors = {}) {
  const model = reactive<ApplicationFormState>({
    label: "Application exemple",
    shortName: "Exemple",
    description: "Description existante",
    status: { status: "to_validate" },
    purposes: [],
    targetPopulations: [],
  });
  const wrapper = mount(ApplicationMainStep, {
    attachTo: document.body,
    props: { modelValue: model, errors, isCreateMode: true, canEditBase: true },
    global: { stubs: { BusinessDivisionSearch: true }, directives: { "use-mermaid": () => {} } },
  });
  return { wrapper, model };
}

describe("ApplicationMainStep", () => {
  it("relie les erreurs aux vrais champs et place le focus sur le nom", async () => {
    const { wrapper } = renderMain({ label: "Le nom est obligatoire.", description: "La description est obligatoire." });
    const label = wrapper.get('[data-testid="application-label"]');
    const description = wrapper.get('[data-testid="markdown-textarea"]');

    expect(label.element).toHaveAttribute("aria-describedby", "application-label-error");
    expect(label.element).toHaveAttribute("aria-invalid", "true");
    expect(wrapper.get("#application-label-error").text()).toBe("Le nom est obligatoire.");
    expect(description.element).toHaveAttribute("aria-describedby", "application-description-error");
    expect(description.element).toHaveAttribute("aria-invalid", "true");
    expect(wrapper.get("#application-description-error").text()).toBe("La description est obligatoire.");

    await wrapper.vm.focusField("label");
    expect(label.element).toHaveFocus();

    await wrapper.setProps({ errors: {} });
    expect(label.element).not.toHaveAttribute("aria-describedby");
    expect(label.element).not.toHaveAttribute("aria-invalid");
    expect(description.element).not.toHaveAttribute("aria-describedby");
    expect(description.element).not.toHaveAttribute("aria-invalid");
  });

  it("revient de l'aperçu markdown au champ de description en erreur", async () => {
    const { wrapper, model } = renderMain({ description: "La description est trop courte." });
    await wrapper.get('[data-testid="markdown-tab-preview"]').trigger("click");
    expect(wrapper.find('[data-testid="markdown-textarea"]').exists()).toBe(false);

    await wrapper.vm.focusField("description");
    const textarea = wrapper.get('[data-testid="markdown-textarea"]');
    expect(textarea.element).toHaveFocus();
    expect(textarea.element).toHaveAttribute("aria-describedby", "application-description-error");
    expect(textarea.element).toHaveValue(model.description);
    expect(wrapper.find('[data-testid="markdown-preview"]').exists()).toBe(false);
  });

  it("conserve les champs et les droits spécifiques au mode édition", async () => {
    const { wrapper, model } = renderMain();
    await wrapper.get('[data-testid="application-label"]').setValue("Nouvelle application");
    expect(model.label).toBe("Nouvelle application");
    expect(wrapper.get('[data-testid="application-step-title-1"]').text()).toContain("Étape 1 sur 4");
    expect(wrapper.find('[data-testid="application-status"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="application-logo"]').exists()).toBe(false);

    await wrapper.setProps({ isCreateMode: false, canEditBase: false });
    expect(wrapper.get('[data-testid="application-step-title-1"]').text()).toBe("Informations principales");
    expect(wrapper.find('[data-testid="application-status"]').exists()).toBe(false);
    for (const testId of ["application-label", "application-shortname", "application-logo", "application-type", "markdown-textarea"]) {
      expect(wrapper.get(`[data-testid="${testId}"]`).element).toBeDisabled();
    }
  });
});

import { enableAutoUnmount, mount } from "@vue/test-utils";
import { nextTick, reactive } from "vue";
import ApplicationDetailsStep from "./ApplicationDetailsStep.vue";
import type { ApplicationFormState } from "./application-form.types";

enableAutoUnmount(afterEach);

function renderDetails() {
  const model = reactive<ApplicationFormState>({
    label: "Application exemple",
    description: "Description",
    status: { status: "to_validate" },
    purposes: [],
    targetPopulations: [],
  });
  const wrapper = mount(ApplicationDetailsStep, {
    attachTo: document.body,
    props: { modelValue: model, isCreateMode: true, canEditBase: true, canEditPriorityRestart: true },
    global: { stubs: { TagSearchSelect: true } },
  });
  return { wrapper, model };
}

describe("ApplicationDetailsStep", () => {
  it.each([
    ["population", "targetPopulations"],
    ["purpose", "purposes"],
  ] as const)("conserve les valeurs et le focus lors des ajouts et suppressions de %s", async (testId, field) => {
    const { wrapper, model } = renderDetails();
    const add = wrapper.get(`[data-testid="application-${testId}-add"]`);
    await add.trigger("click");
    await nextTick();
    const first = wrapper.get(`[data-testid="application-${testId}-0"]`);
    expect(first.element).toHaveFocus();
    await first.setValue("Première valeur");

    await add.trigger("click");
    await nextTick();
    const second = wrapper.get(`[data-testid="application-${testId}-1"]`);
    expect(second.element).toHaveFocus();
    await second.setValue("Deuxième valeur");
    expect(model[field]).toEqual(["Première valeur", "Deuxième valeur"]);

    await wrapper.get(`[data-testid="application-${testId}-remove-0"]`).trigger("click");
    await nextTick();
    expect(model[field]).toEqual(["Deuxième valeur"]);
    const remaining = wrapper.get(`[data-testid="application-${testId}-0"]`);
    expect(remaining.element).toHaveValue("Deuxième valeur");
    expect(remaining.element).toHaveFocus();

    await wrapper.get(`[data-testid="application-${testId}-remove-0"]`).trigger("click");
    await nextTick();
    expect(model[field]).toEqual([]);
    expect(add.element).toHaveFocus();
  });

  it("sépare les droits sur les données de base et la priorité de redémarrage", async () => {
    const { wrapper } = renderDetails();
    await wrapper.setProps({ isCreateMode: false, canEditBase: false, canEditPriorityRestart: true });
    expect(wrapper.get('[data-testid="application-step-title-2"]').text()).toBe("Détails de l'application");
    expect(wrapper.get('[data-testid="application-purpose-add"]').element).toBeDisabled();
    expect(wrapper.get('[data-testid="application-population-add"]').element).toBeDisabled();
    expect(wrapper.get('[data-testid="application-priority-restart"]').element).not.toBeDisabled();

    await wrapper.setProps({ canEditBase: true, canEditPriorityRestart: false });
    expect(wrapper.get('[data-testid="application-purpose-add"]').element).not.toBeDisabled();
    expect(wrapper.get('[data-testid="application-priority-restart"]').element).toBeDisabled();
  });
});

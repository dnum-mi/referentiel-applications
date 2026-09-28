import { enableAutoUnmount, mount } from "@vue/test-utils";
import MarkdownEditor from "./MarkdownEditor.vue";

enableAutoUnmount(afterEach);

describe("MarkdownEditor — erreurs et focus", () => {
  it("applique la description et l'état invalide au textarea, puis les retire", async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: "Texte", disabled: false, ariaLabel: "Description", describedby: "description-error", invalid: true },
      global: { directives: { "use-mermaid": () => {} } },
    });
    const textarea = wrapper.get("textarea");
    expect(textarea.element).toHaveAttribute("aria-label", "Description");
    expect(textarea.element).toHaveAttribute("aria-describedby", "description-error");
    expect(textarea.element).toHaveAttribute("aria-invalid", "true");

    await wrapper.setProps({ describedby: undefined, invalid: false });
    expect(textarea.element).not.toHaveAttribute("aria-describedby");
    expect(textarea.element).not.toHaveAttribute("aria-invalid");
  });

  it("expose un focus qui rouvre l'édition sans perdre la saisie", async () => {
    const wrapper = mount(MarkdownEditor, {
      attachTo: document.body,
      props: { modelValue: "Texte initial", disabled: false },
      global: { directives: { "use-mermaid": () => {} } },
    });
    await wrapper.get("textarea").setValue("Texte en cours");
    await wrapper.get('[data-testid="markdown-tab-preview"]').trigger("click");
    expect(wrapper.find("textarea").exists()).toBe(false);
    await wrapper.vm.focus();
    expect(wrapper.get("textarea").element).toHaveValue("Texte en cours");
    expect(wrapper.get("textarea").element).toHaveFocus();
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["Texte en cours"]);
  });
});

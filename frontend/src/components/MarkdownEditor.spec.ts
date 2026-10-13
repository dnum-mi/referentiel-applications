import { enableAutoUnmount, mount } from "@vue/test-utils";
import MarkdownEditor from "./MarkdownEditor.vue";
import { defineComponent, h, ref } from "vue";

enableAutoUnmount(afterEach);

describe("MarkdownEditor — erreurs et focus", () => {
  it("rend le focus et conserve la sélection du texte après sa mise en gras", async () => {
    const value = ref("Alpha");
    const host = defineComponent({
      setup: () => () =>
        h(MarkdownEditor, {
          modelValue: value.value,
          disabled: false,
          "onUpdate:modelValue": (next: string) => {
            value.value = next;
          },
        }),
    });
    const wrapper = mount(host, { attachTo: document.body, global: { directives: { "use-mermaid": () => {} } } });
    const textarea = wrapper.get("textarea").element;
    textarea.focus();
    textarea.setSelectionRange(0, 5);
    const bold = wrapper.get<HTMLButtonElement>('[data-testid="markdown-toolbar-0"]');
    bold.element.focus();
    await bold.trigger("click");
    expect(value.value).toBe("**Alpha**");
    expect(textarea).toHaveFocus();
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe("Alpha");
  });

  it.each([false, true])("conserve la navigation Tab avec plusieurs lignes sélectionnées (Maj : %s)", async (shiftKey) => {
    const value = "Première ligne\nDeuxième ligne";
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: value, disabled: false },
      global: { directives: { "use-mermaid": () => {} } },
    });
    const textarea = wrapper.get("textarea").element;
    textarea.setSelectionRange(0, value.length);
    const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(textarea.value).toBe(value);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
  it("annonce le mode choisi et conserve les noms des commandes en lecture seule", async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: "Texte", disabled: false },
      global: { directives: { "use-mermaid": () => {} } },
    });
    const edit = wrapper.get('[data-testid="markdown-tab-edit"]');
    const preview = wrapper.get('[data-testid="markdown-tab-preview"]');
    expect(edit.element).toHaveAttribute("aria-pressed", "true");
    expect(preview.element).toHaveAttribute("aria-pressed", "false");
    expect(wrapper.find(`#${edit.attributes("aria-controls")}`).exists()).toBe(true);
    await preview.trigger("click");
    expect(edit.element).toHaveAttribute("aria-pressed", "false");
    expect(preview.element).toHaveAttribute("aria-pressed", "true");

    await wrapper.setProps({ disabled: true });
    for (const command of wrapper.findAll('[data-testid^="markdown-toolbar-"]')) {
      expect(command.element).toHaveAccessibleName();
      expect(command.element).toBeDisabled();
      await command.trigger("click");
    }
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

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

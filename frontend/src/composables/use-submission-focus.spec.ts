import { mount, enableAutoUnmount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import { useSubmissionFocus } from "./use-submission-focus";

enableAutoUnmount(afterEach);

function renderDialog() {
  const busy = ref(false);
  const wrapper = mount(
    defineComponent({
      setup() {
        useSubmissionFocus(busy);
        return () =>
          h("div", { role: "dialog" }, [
            h("button", { class: "fr-btn--close" }, "Fermer"),
            h("input", { name: "value" }),
            h("button", { disabled: busy.value, "data-testid": "submit" }, "Enregistrer"),
          ]);
      },
    }),
    { attachTo: document.body },
  );
  return { wrapper, busy, submit: wrapper.get('[data-testid="submit"]'), close: wrapper.get(".fr-btn--close") };
}

describe("useSubmissionFocus", () => {
  it("garde le focus dans le dialogue puis le restitue au bouton après un échec", async () => {
    const { busy, submit, close } = renderDialog();
    (submit.element as HTMLButtonElement).focus();
    busy.value = true;
    // jsdom ne reproduit pas le retrait du focus d'un bouton disabled par Chromium.
    (submit.element as HTMLButtonElement).blur();
    await nextTick();
    await nextTick();
    expect(submit.element).toBeDisabled();
    expect(close.element).toHaveFocus();

    busy.value = false;
    await nextTick();
    await nextTick();
    expect(submit.element).not.toBeDisabled();
    expect(submit.element).toHaveFocus();
  });

  it("respecte le déplacement volontaire vers un champ pendant l'attente", async () => {
    const { busy, submit, wrapper } = renderDialog();
    (submit.element as HTMLButtonElement).focus();
    busy.value = true;
    (submit.element as HTMLButtonElement).blur();
    await nextTick();
    await nextTick();
    const field = wrapper.get("input").element;
    field.focus();
    busy.value = false;
    await nextTick();
    await nextTick();
    expect(field).toHaveFocus();
  });

  it("ne reprend pas le focus quand le dialogue est fermé avant la réponse", async () => {
    const { busy, submit, wrapper } = renderDialog();
    (submit.element as HTMLButtonElement).focus();
    busy.value = true;
    (submit.element as HTMLButtonElement).blur();
    await nextTick();
    await nextTick();
    wrapper.element.remove();
    busy.value = false;
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(document.body);
  });
});

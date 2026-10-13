import { DsfrModal, DsfrTooltip } from "@gouvminint/vue-dsfr";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";

enableAutoUnmount(afterEach);

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

beforeAll(() => {
  // jsdom has no top layer. Keep the real DSFR component and emulate only
  // the browser dialog API so its own opened watcher and key handler run.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false;
    },
  });
});

afterAll(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

beforeEach(() => {
  vi.useFakeTimers();
  // Focus-trap uses layout to identify tabbable controls. jsdom has no layout,
  // so expose rectangles only inside an actually opened browser dialog.
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    const rects = this.closest("dialog")?.open ? [new DOMRect(0, 0, 1, 1)] : [];
    return Object.assign(rects, { item: (index: number) => rects[index] ?? null });
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function render() {
  const opened = ref(false);
  const opener = ref<HTMLButtonElement>();
  const returnFocus = vi.fn(() => opener.value?.focus());
  const close = vi.fn(() => (opened.value = false));
  const closeOther = vi.fn();
  const otherOrigin = { focus: vi.fn() };
  const wrapper = mount(
    defineComponent({
      components: { DsfrModal, DsfrTooltip },
      setup: () => ({ opened, opener, origin: { focus: returnFocus }, close, closeOther, otherOrigin }),
      template: `
        <button ref="opener" type="button" @click="opened = true">Ouvrir</button>
        <label for="outside">Champ extérieur</label><input id="outside" />
        <DsfrTooltip aria-label="Aide" content="Aide du tableau des acteurs." />
        <DsfrModal :opened="opened" :origin="origin" title="Modifier un acteur" @close="close">
          <label for="inside">Prénom</label><input id="inside" />
        </DsfrModal>
        <DsfrModal :opened="false" :origin="otherOrigin" title="Autre fenêtre fermée" @close="closeOther" />
      `,
    }),
    { attachTo: document.body },
  );
  return { wrapper, close, closeOther, returnFocus, otherOrigin };
}

describe("Accessibilité des modales DSFR", () => {
  it("ne ferme pas une modale déjà fermée et préserve le focus extérieur sur Échap", async () => {
    const scene = render();
    const field = scene.wrapper.get<HTMLInputElement>("#outside");
    field.element.focus();
    await field.trigger("keydown", { key: "Escape" });
    await flushPromises();
    expect(field.element).toHaveFocus();
    expect(scene.close).not.toHaveBeenCalled();
    expect(scene.closeOther).not.toHaveBeenCalled();
    expect(scene.returnFocus).not.toHaveBeenCalled();
    expect(scene.otherOrigin.focus).not.toHaveBeenCalled();
  });

  it("laisse Échap fermer l’aide en conservant le focus et les modales fermées", async () => {
    const scene = render();
    const help = scene.wrapper.get<HTMLButtonElement>('[aria-label="Aide"]');
    help.element.focus();
    await help.trigger("click");
    expect(scene.wrapper.get('[role="tooltip"]').classes()).toContain("fr-tooltip--shown");
    await help.trigger("keydown", { key: "Escape" });
    await flushPromises();
    expect(scene.wrapper.get('[role="tooltip"]').classes()).not.toContain("fr-tooltip--shown");
    expect(help.element).toHaveFocus();
    expect(scene.close).not.toHaveBeenCalled();
    expect(scene.closeOther).not.toHaveBeenCalled();
    expect(scene.returnFocus).not.toHaveBeenCalled();
  });

  it("ferme seulement la modale ouverte sur Échap et rend le focus à son origine", async () => {
    const scene = render();
    const opener = scene.wrapper.get<HTMLButtonElement>("button");
    opener.element.focus();
    await opener.trigger("click");
    await vi.advanceTimersByTimeAsync(100);
    const field = scene.wrapper.get<HTMLInputElement>("#inside");
    expect(field.element.closest("dialog")?.open).toBe(true);
    field.element.focus();
    await field.trigger("keydown", { key: "Escape" });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(0);
    expect(scene.wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(field.element.isConnected).toBe(false);
    expect(scene.close).toHaveBeenCalledOnce();
    expect(scene.returnFocus).toHaveBeenCalledOnce();
    expect(scene.wrapper.get("button").element).toHaveFocus();
    expect(scene.closeOther).not.toHaveBeenCalled();
    expect(scene.otherOrigin.focus).not.toHaveBeenCalled();
  });
});

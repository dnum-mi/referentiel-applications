import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { LabelSourceDto } from "@/client/types.gen";
import LabelSourceActions from "./LabelSourceActions.vue";
const { save, remove, errorToast } = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn(), errorToast: vi.fn() }));
vi.mock("@/api", () => ({ default: { labelSourceControllerUpdate: save, labelSourceControllerRemove: remove } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: errorToast, addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
const fixture = { id: "source-qa", source: "SOURCE_QA" } satisfies LabelSourceDto;
beforeEach(() => {
  save.mockReset();
  remove.mockReset();
  errorToast.mockReset();
});
function renderActions() {
  return mount(LabelSourceActions, {
    attachTo: document.body,
    props: { labelSource: fixture },
    global: {
      stubs: {
        DsfrModal: {
          props: ["opened"],
          template:
            '<section v-if="opened" role="dialog"><button class="fr-btn--close">Fermer</button><slot/><slot name="footer"/></section>',
        },
      },
    },
  });
}
describe("LabelSourceActions — mutation différée et focus", () => {
  it.each([
    { action: "save", moveFocus: false },
    { action: "save", moveFocus: true },
    { action: "delete", moveFocus: false },
    { action: "delete", moveFocus: true },
  ] as const)("$action : restaure le contexte, choix volontaire=$moveFocus", async ({ action, moveFocus }) => {
    let finish = () => {};
    const mutation = action === "save" ? save : remove;
    mutation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ response: { ok: false, status: 500 }, error: "refus fictif" });
        }),
    );
    const wrapper = renderActions();
    await wrapper
      .get('[data-testid="' + (action === "save" ? "admin-label-source-edit-btn" : "admin-label-source-delete-btn") + '"]')
      .trigger("click");
    const button = wrapper.get<HTMLButtonElement>(
      '[data-testid="' + (action === "save" ? "admin-save-perms-btn" : "admin-delete-confirm-btn") + '"]',
    );
    button.element.focus();
    await button.trigger("click");
    expect(button.element).toBeDisabled();
    // Reproduce loss of the focused disabled control while the real handler waits.
    const transient = document.createElement("button");
    document.body.append(transient);
    transient.focus();
    transient.remove();
    await flushPromises();
    const close = wrapper.get<HTMLButtonElement>(".fr-btn--close");
    expect(close.element).toHaveFocus();
    const cancel = wrapper.get<HTMLButtonElement>(
      '[data-testid="' + (action === "save" ? "admin-cancel-btn" : "admin-delete-cancel-btn") + '"]',
    );
    if (moveFocus) cancel.element.focus();
    finish();
    await flushPromises();
    expect(moveFocus ? cancel.element : button.element).toHaveFocus();
    expect(button.element).not.toBeDisabled();
    if (action === "save") expect(wrapper.get('[role="dialog"]').text()).toContain("Erreur lors de la sauvegarde de la source");
    else expect(errorToast).toHaveBeenCalledWith("Erreur lors de la suppression de la source");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });
});

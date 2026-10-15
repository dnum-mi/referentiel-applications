import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { MditCampaignDto } from "@/client/types.gen";
import MditCampaignActions from "./MditCampaignActions.vue";
const { save, remove, errorToast } = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn(), errorToast: vi.fn() }));
vi.mock("@/api", () => ({ default: { mditCampaignControllerUpdate: save, mditCampaignControllerRemove: remove } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: errorToast, addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
const fixture = { id: "campaign-qa", year: 2026, label: "Campagne fictive", isActive: true } satisfies MditCampaignDto;
beforeEach(() => {
  save.mockReset();
  remove.mockReset();
  errorToast.mockReset();
});
function renderActions() {
  return mount(MditCampaignActions, {
    attachTo: document.body,
    props: { campaign: fixture },
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
describe("MditCampaignActions — mutation différée et focus", () => {
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
      .get('[data-testid="' + (action === "save" ? "admin-campaign-edit-btn" : "admin-campaign-delete-btn") + '"]')
      .trigger("click");
    const button = wrapper.get<HTMLButtonElement>(
      '[data-testid="' + (action === "save" ? "admin-campaign-save-btn" : "admin-campaign-delete-confirm-btn") + '"]',
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
      '[data-testid="' + (action === "save" ? "admin-campaign-cancel-btn" : "admin-campaign-delete-cancel-btn") + '"]',
    );
    if (moveFocus) cancel.element.focus();
    finish();
    await flushPromises();
    expect(moveFocus ? cancel.element : button.element).toHaveFocus();
    expect(button.element).not.toBeDisabled();
    if (action === "save") expect(wrapper.get('[role="dialog"]').text()).toContain("Erreur lors de la sauvegarde de la campagne.");
    else expect(errorToast).toHaveBeenCalledWith("Erreur lors de la suppression de la campagne");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  });
});

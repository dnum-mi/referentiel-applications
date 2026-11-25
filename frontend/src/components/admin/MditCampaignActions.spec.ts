import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { MditCampaignDto } from "@/client/types.gen";
import MditCampaignActions from "./MditCampaignActions.vue";
const { save, remove, errorToast } = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn(), errorToast: vi.fn() }));
vi.mock("@/api", () => ({
  default: { mditCampaignControllerCreate: save, mditCampaignControllerUpdate: save, mditCampaignControllerRemove: remove },
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: errorToast, addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
const fixture = { id: "campaign-qa", year: 2026, label: "Campagne fictive", isActive: true } satisfies MditCampaignDto;
beforeEach(() => {
  save.mockReset();
  remove.mockReset();
  errorToast.mockReset();
});
function renderActions(campaign: MditCampaignDto | undefined = fixture) {
  return mount(MditCampaignActions, {
    attachTo: document.body,
    props: { campaign },
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

describe("MditCampaignActions — erreurs associées au millésime (#3322)", () => {
  it.each(["1999", "2101", "", "2026.5"])("refuse %s, conserve l’aide et autorise la correction", async (value) => {
    save.mockResolvedValue({ response: { ok: true }, data: fixture });
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-campaign-edit-btn"]').trigger("click");
    const input = wrapper.get<HTMLInputElement>('input[data-testid="campaign-year"]');
    expect(input.element).not.toHaveAttribute("aria-invalid");
    await input.setValue(value);
    await wrapper.get('[data-testid="admin-campaign-save-btn"]').trigger("click");
    expect(save).not.toHaveBeenCalled();
    expect(input.element.value).toBe(value);
    expect(input.element).toHaveAttribute("aria-invalid", "true");
    expect(input.element).toHaveAccessibleDescription("Le millésime doit être une année entre 2000 et 2100.");
    expect(document.getElementById(input.attributes("aria-describedby") ?? "")).toHaveTextContent("Le millésime");
    expect(input.element).toHaveAccessibleName(expect.stringContaining("Année sur 4 chiffres, entre 2000 et 2100"));
    await input.setValue("2000");
    expect(input.element).not.toHaveAttribute("aria-invalid");
    expect(input.element).not.toHaveAttribute("aria-describedby");
    await wrapper.get('[data-testid="admin-campaign-save-btn"]').trigger("click");
    await flushPromises();
    expect(save).toHaveBeenCalledExactlyOnceWith({ path: { id: fixture.id }, body: { year: 2000, label: fixture.label, isActive: true } });
  });

  it("valide aussi la création et réinitialise les erreurs à la réouverture", async () => {
    save.mockResolvedValue({ response: { ok: true }, data: fixture });
    const wrapper = renderActions();
    await wrapper.setProps({ campaign: undefined });
    await wrapper.get('[data-testid="admin-create-campaign-btn"]').trigger("click");
    await wrapper.get('[data-testid="campaign-year"]').setValue("1999");
    await wrapper.get('[data-testid="admin-campaign-save-btn"]').trigger("click");
    expect(save).not.toHaveBeenCalled();
    expect(wrapper.get('input[data-testid="campaign-year"]').element).toHaveAttribute("aria-invalid", "true");
    await wrapper.get('[data-testid="admin-campaign-cancel-btn"]').trigger("click");
    await wrapper.get('[data-testid="admin-create-campaign-btn"]').trigger("click");
    expect(wrapper.get('input[data-testid="campaign-year"]').element).not.toHaveAttribute("aria-invalid");
    await wrapper.get('[data-testid="campaign-year"]').setValue("2100");
    await wrapper.get('[data-testid="admin-campaign-save-btn"]').trigger("click");
    await flushPromises();
    expect(save).toHaveBeenCalledExactlyOnceWith({ body: { year: 2100, label: undefined, isActive: true } });
  });
});

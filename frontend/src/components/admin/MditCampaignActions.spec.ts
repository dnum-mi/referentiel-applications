import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { MditCampaignDto } from "@/client/types.gen";
import MditCampaignActions from "./MditCampaignActions.vue";
const { save, remove, errorToast } = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn(), errorToast: vi.fn() }));
vi.mock("@/api", () => ({
  default: { mditCampaignControllerUpdate: save, mditCampaignControllerCreate: save, mditCampaignControllerRemove: remove },
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: errorToast, addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
const fixture = { id: "campaign-qa", year: 2026, label: "Campagne fictive", isActive: true } satisfies MditCampaignDto;
beforeEach(() => {
  save.mockReset();
  remove.mockReset();
  errorToast.mockReset();
});
function renderActions(create = false) {
  return mount(MditCampaignActions, {
    attachTo: document.body,
    props: { campaign: create ? undefined : fixture },
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

describe("MditCampaignActions — erreurs du millésime", () => {
  it.each([
    { create: true, year: "1999" },
    { create: false, year: "2101" },
    { create: false, year: "2026.5" },
    { create: true, year: "" },
  ])("refuse $year et permet sa correction, création=$create", async ({ create, year }) => {
    save.mockResolvedValue({ response: { ok: true } });
    const wrapper = renderActions(create);
    await wrapper.get(`[data-testid="${create ? "admin-create-campaign-btn" : "admin-campaign-edit-btn"}"]`).trigger("click");
    const input = wrapper.get<HTMLInputElement>('[data-testid="campaign-year"]');
    const label = wrapper.get<HTMLInputElement>('[data-testid="campaign-label"]');
    const submit = wrapper.get<HTMLButtonElement>('[data-testid="admin-campaign-save-btn"]');
    await label.setValue("Libellé à conserver");
    await input.setValue(year);
    expect(input.attributes("aria-invalid")).toBeUndefined();
    submit.element.focus();
    await submit.trigger("click");
    await flushPromises();

    expect(save).not.toHaveBeenCalled();
    expect(input.element).toHaveFocus();
    expect(input.element).toHaveAttribute("aria-invalid", "true");
    expect(input.element).toHaveAccessibleDescription("Le millésime doit être une année entre 2000 et 2100.");
    expect(input.element).toHaveAccessibleName(/Année sur 4 chiffres, entre 2000 et 2100/);
    expect(label.element).toHaveValue("Libellé à conserver");

    await input.setValue("2027");
    expect(input.attributes("aria-invalid")).toBeUndefined();
    expect(input.attributes("aria-describedby")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Le millésime doit être une année entre 2000 et 2100.");
    expect(input.element).toHaveAccessibleName(/Année sur 4 chiffres, entre 2000 et 2100/);
    await submit.trigger("click");
    await flushPromises();
    expect(save).toHaveBeenCalledExactlyOnceWith({
      ...(create ? {} : { path: { id: fixture.id } }),
      body: { year: 2027, label: "Libellé à conserver", isActive: true },
    });
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });
});

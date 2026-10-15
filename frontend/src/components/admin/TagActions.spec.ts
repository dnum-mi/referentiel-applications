import { createPinia } from "pinia";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { TagDto } from "@/client/types.gen";
import TagActions from "./TagActions.vue";

const { updateTag, errorToast, successToast } = vi.hoisted(() => ({
  updateTag: vi.fn(),
  errorToast: vi.fn(),
  successToast: vi.fn(),
}));
vi.mock("@/api/index", () => ({ default: { tagsControllerUpdate: updateTag } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: errorToast, addSuccessMessage: successToast }) }));
enableAutoUnmount(afterEach);

const tag = { id: "tag-qa", name: "tag-qa", createdAt: "2026-10-13T00:00:00Z" } satisfies TagDto;
function renderActions() {
  return mount(TagActions, {
    attachTo: document.body,
    props: { tag },
    global: {
      plugins: [createPinia()],
      stubs: {
        VIcon: true,
        DsfrModal: {
          props: ["opened"],
          template:
            '<section v-if="opened" role="dialog"><button class="fr-btn--close">Fermer</button><slot/><slot name="footer"/></section>',
        },
      },
    },
  });
}

beforeEach(() => {
  updateTag.mockReset();
  errorToast.mockReset();
  successToast.mockReset();
});

describe("TagActions — focus après une réponse différée", () => {
  it("rejoint le champ en erreur quand la commande d’enregistrement garde le focus", async () => {
    updateTag.mockResolvedValue({ response: { ok: false, status: 500 } });
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-tag-edit-btn"]').trigger("click");
    const input = wrapper.get<HTMLInputElement>('[data-testid="tag-name"]');
    await input.setValue("tag-qa-new");
    const save = wrapper.get<HTMLButtonElement>('[data-testid="admin-save-perms-btn"]');
    save.element.focus();
    await save.trigger("click");
    await flushPromises();
    expect(input.element).toHaveFocus();
    expect(input.element).toHaveValue("tag-qa-new");
    expect(wrapper.get('[data-testid="admin-edit-tag-modal"]').text()).toContain("Erreur lors de la sauvegarde du tag");
    expect(wrapper.emitted("fetchTags")).toBeUndefined();
  });

  it.each([500, 400])("préserve Annuler rejoint pendant une réponse lente (%s)", async (status) => {
    let finish = () => {};
    updateTag.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ response: { ok: false, status }, error: { message: ["Le tag est invalide."] } });
        }),
    );
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-tag-edit-btn"]').trigger("click");
    const input = wrapper.get<HTMLInputElement>('[data-testid="tag-name"]');
    await input.setValue("tag-qa-new");
    const save = wrapper.get<HTMLButtonElement>('[data-testid="admin-save-perms-btn"]');
    save.element.focus();
    await save.trigger("click");
    const cancel = wrapper.get<HTMLButtonElement>('[data-testid="admin-cancel-btn"]');
    cancel.element.focus();
    finish();
    await flushPromises();
    expect(cancel.element).toHaveFocus();
    expect(input.element).toHaveValue("tag-qa-new");
    expect(wrapper.get('[data-testid="admin-edit-tag-modal"]').text()).toContain(
      status === 400 ? "Le tag est invalide." : "Erreur lors de la sauvegarde du tag",
    );
    expect(wrapper.emitted("fetchTags")).toBeUndefined();
    await cancel.trigger("click");
    expect(wrapper.find('[data-testid="admin-edit-tag-modal"]').exists()).toBe(false);
  });
});

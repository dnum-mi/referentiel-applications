import { createPinia } from "pinia";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { QualityCampaignDto } from "@/client/types.gen";
import QualityCampaignActions from "./QualityCampaignActions.vue";

const { updateCampaign, removeCampaign, successToast, errorToast } = vi.hoisted(() => ({
  updateCampaign: vi.fn(),
  removeCampaign: vi.fn(),
  successToast: vi.fn(),
  errorToast: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: { qualityCampaignControllerUpdate: updateCampaign, qualityCampaignControllerRemove: removeCampaign },
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addSuccessMessage: successToast, addErrorMessage: errorToast }),
}));

const campaign = {
  id: "campaign-1",
  name: "Campagne qualité",
  filters: {},
  sponsorEmails: ["initial@example.test"],
  startDate: new Date("2026-10-12T00:00:00Z"),
  createdAt: new Date("2026-10-12T00:00:00Z"),
  status: "scheduled",
  targetCount: 2,
} satisfies QualityCampaignDto;

const success = () => ({ data: campaign, response: { ok: true } });
enableAutoUnmount(afterEach);

function renderActions() {
  return mount(QualityCampaignActions, {
    attachTo: document.body,
    props: { campaign },
    global: {
      plugins: [createPinia()],
      stubs: {
        DsfrModal: {
          props: ["opened"],
          template: '<section v-if="opened" role="dialog"><slot /><slot name="footer" /></section>',
        },
        VIcon: true,
      },
    },
  });
}

beforeEach(() => {
  updateCampaign.mockReset().mockResolvedValue(success());
  removeCampaign.mockReset();
  successToast.mockReset();
  errorToast.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("QualityCampaignActions — confirmation des données personnelles", () => {
  it("garde la confirmation et son contrôle après une suppression refusée, puis permet le réessai", async () => {
    removeCampaign
      .mockResolvedValueOnce({ error: { message: "Indisponible" }, response: { ok: false } })
      .mockResolvedValueOnce({ response: { ok: true } });
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-delete-btn"]').trigger("click");
    const confirm = wrapper.get<HTMLButtonElement>('[data-testid="admin-quality-campaign-delete-confirm-btn"]');
    confirm.element.focus();
    await confirm.trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="admin-delete-quality-campaign-modal"]').text()).toContain("La campagne n’a pas été supprimée");
    expect(confirm.element).toHaveFocus();
    expect(wrapper.emitted("fetchCampaigns")).toBeUndefined();
    await confirm.trigger("click");
    await flushPromises();
    expect(removeCampaign).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="admin-delete-quality-campaign-modal"]').exists()).toBe(false);
    expect(wrapper.emitted("fetchCampaigns")).toHaveLength(1);
  });
  it("ne reprend pas le focus choisi hors de la confirmation pendant une suppression lente", async () => {
    let finish = () => {};
    removeCampaign.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ response: { ok: true } });
        }),
    );
    const title = document.createElement("h2");
    title.dataset.testid = "admin-quality-campaigns-title";
    const otherCommand = document.createElement("button");
    document.body.append(title, otherCommand);
    try {
      const wrapper = renderActions();
      await wrapper.get('[data-testid="admin-quality-campaign-delete-btn"]').trigger("click");
      const confirm = wrapper.get<HTMLButtonElement>('[data-testid="admin-quality-campaign-delete-confirm-btn"]');
      confirm.element.focus();
      await confirm.trigger("click");
      otherCommand.focus();
      finish();
      await flushPromises();
      expect(wrapper.emitted("fetchCampaigns")).toHaveLength(1);
      expect(wrapper.find('[data-testid="admin-delete-quality-campaign-modal"]').exists()).toBe(false);
      expect(otherCommand).toHaveFocus();
    } finally {
      title.remove();
      otherCommand.remove();
    }
  });
  it("annule une modification des sponsors sans requête et conserve la saisie et le focus", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    const email = wrapper.get('[data-testid="quality-campaign-sponsor-email-0"]');
    await email.setValue("nouveau@example.test");
    const save = wrapper.get<HTMLButtonElement>('[data-testid="admin-quality-campaign-save-btn"]');
    await save.trigger("click");
    await flushPromises();

    expect(confirm).toHaveBeenCalledExactlyOnceWith(
      "Confirmer la modification des adresses email des sponsors de la campagne « Campagne qualité » ?\nNouvelles adresses : nouveau@example.test.",
    );
    expect(updateCampaign).not.toHaveBeenCalled();
    expect(email.element).toHaveValue("nouveau@example.test");
    expect(save.element).toHaveFocus();
    expect(wrapper.emitted("fetchCampaigns")).toBeUndefined();
  });

  it("enregistre une seule fois les nouvelles adresses après accord", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    await wrapper.get('[data-testid="quality-campaign-sponsor-email-0"]').setValue(" nouveau@example.test ");
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    await flushPromises();

    expect(confirm).toHaveBeenCalledOnce();
    expect(updateCampaign).toHaveBeenCalledExactlyOnceWith({
      path: { id: campaign.id },
      body: {
        name: campaign.name,
        sponsorEmails: ["nouveau@example.test"],
        message: null,
        startDate: new Date("2026-10-12T00:00:00Z"),
        endDate: null,
      },
    });
    expect(wrapper.find('[data-testid="admin-edit-quality-campaign-modal"]').exists()).toBe(false);
    expect(wrapper.emitted("fetchCampaigns")).toHaveLength(1);
  });

  it("confirme aussi le retrait du dernier sponsor", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    await wrapper.get('[data-testid="quality-campaign-sponsor-email-remove-0"]').trigger("click");
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("Nouvelles adresses : aucun sponsor."));
    expect(updateCampaign).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    await flushPromises();
    expect(updateCampaign).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ body: expect.objectContaining({ sponsorEmails: [] }) }),
    );
  });

  it("laisse les changements métier seuls sans confirmation de données personnelles", async () => {
    const confirm = vi.spyOn(globalThis, "confirm");
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    await wrapper.get('[data-testid="quality-campaign-name"]').setValue("Campagne renommée");
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    await flushPromises();

    expect(confirm).not.toHaveBeenCalled();
    expect(updateCampaign).toHaveBeenCalledOnce();
  });

  it("conserve les adresses et rend le focus après une erreur, puis reconfirme chaque essai", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    updateCampaign.mockResolvedValue({ error: { message: "Indisponible" }, response: { ok: false } });
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    const email = wrapper.get('[data-testid="quality-campaign-sponsor-email-0"]');
    await email.setValue("nouveau@example.test");
    const save = wrapper.get<HTMLButtonElement>('[data-testid="admin-quality-campaign-save-btn"]');
    save.element.focus();
    await save.trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="quality-campaign-form-error"]').text()).toContain("Erreur lors de la sauvegarde");
    expect(email.element).toHaveValue("nouveau@example.test");
    expect(save.element).toHaveFocus();
    expect(save.element).not.toBeDisabled();
    expect(wrapper.emitted("fetchCampaigns")).toBeUndefined();

    await email.setValue("autre@example.test");
    confirm.mockReturnValue(false);
    await save.trigger("click");
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("autre@example.test"));
    expect(updateCampaign).toHaveBeenCalledOnce();
  });

  it("respecte le focus choisi dans un autre champ pendant une erreur lente", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    const failure = () => ({ error: { message: "Indisponible" }, response: { ok: false } });
    let finish = () => {};
    updateCampaign.mockImplementation(
      () =>
        new Promise<ReturnType<typeof failure>>((resolve) => {
          finish = () => resolve(failure());
        }),
    );
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    await wrapper.get('[data-testid="quality-campaign-sponsor-email-0"]').setValue("nouveau@example.test");
    const save = wrapper.get<HTMLButtonElement>('[data-testid="admin-quality-campaign-save-btn"]');
    save.element.focus();
    await save.trigger("click");
    expect(save.element).toBeDisabled();
    const name = wrapper.get<HTMLInputElement>('[data-testid="quality-campaign-name"]');
    name.element.focus();
    finish();
    await flushPromises();

    expect(name.element).toHaveFocus();
    expect(save.element).not.toBeDisabled();
    expect(wrapper.get('[data-testid="quality-campaign-form-error"]').text()).toContain("Erreur lors de la sauvegarde");
    expect(updateCampaign).toHaveBeenCalledOnce();
  });

  it("bloque les doubles clics pendant la requête", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    let finish = () => {};
    updateCampaign.mockImplementation(
      () =>
        new Promise<ReturnType<typeof success>>((resolve) => {
          finish = () => resolve(success());
        }),
    );
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    await wrapper.get('[data-testid="quality-campaign-sponsor-email-0"]').setValue("nouveau@example.test");
    const save = wrapper.get('[data-testid="admin-quality-campaign-save-btn"]');
    await save.trigger("click");
    await save.trigger("click");
    expect(updateCampaign).toHaveBeenCalledOnce();
    finish();
    await flushPromises();
  });
});

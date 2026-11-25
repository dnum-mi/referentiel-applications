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

function renderActions(persistModal = false) {
  return mount(QualityCampaignActions, {
    attachTo: document.body,
    props: { campaign },
    global: {
      plugins: [createPinia()],
      stubs: {
        DsfrModal: {
          props: ["opened"],
          template: persistModal
            ? '<section v-show="opened" role="dialog"><slot /><slot name="footer" /></section>'
            : '<section v-if="opened" role="dialog"><slot /><slot name="footer" /></section>',
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

describe("QualityCampaignActions — erreurs des champs", () => {
  it("associe les erreurs aux vrais champs et suit leur ordre jusqu'à une sauvegarde valide", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    expect(wrapper.get('[data-testid="required-fields-hint"]').text()).toBe("* = champs obligatoires");
    const name = wrapper.get<HTMLInputElement>('[data-testid="quality-campaign-name"]');
    const sponsor = wrapper.get<HTMLInputElement>('[data-testid="quality-campaign-sponsor-email-0"]');
    const startDate = wrapper.get<HTMLInputElement>('[data-testid="quality-campaign-start-date"]');
    const message = wrapper.get<HTMLTextAreaElement>('[data-testid="quality-campaign-message"]');
    const save = wrapper.get<HTMLButtonElement>('[data-testid="admin-quality-campaign-save-btn"]');
    await name.setValue(" ");
    await sponsor.setValue("email-invalide");
    await startDate.setValue("");
    await message.setValue("Message à conserver");
    expect(name.attributes("aria-invalid")).toBeUndefined();
    expect(startDate.attributes("aria-invalid")).toBeUndefined();
    save.element.focus();
    await save.trigger("click");
    await flushPromises();

    expect(updateCampaign).not.toHaveBeenCalled();
    expect(name.element).toHaveFocus();
    expect(name.element).toHaveAttribute("aria-invalid", "true");
    expect(name.element).toHaveAccessibleDescription("Le nom de la campagne est requis.");
    expect(startDate.element).toHaveAttribute("aria-invalid", "true");
    expect(startDate.element).toHaveAccessibleDescription("La date de début est requise.");
    expect(startDate.element).toHaveAccessibleName(/Déclenche l'envoi automatique aux acteurs/);
    expect(sponsor.element).toHaveAttribute("aria-invalid", "true");
    expect(sponsor.element).toHaveAccessibleDescription("Email invalide. Format attendu – ex : exemple@mail.fr");
    expect(message.element).toHaveValue("Message à conserver");

    await name.setValue("Campagne corrigée");
    expect(name.attributes("aria-invalid")).toBeUndefined();
    expect(name.attributes("aria-describedby")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Le nom de la campagne est requis.");
    save.element.focus();
    await save.trigger("click");
    await flushPromises();
    expect(sponsor.element).toHaveFocus();
    expect(updateCampaign).not.toHaveBeenCalled();

    await sponsor.setValue("corrige@example.test");
    expect(sponsor.attributes("aria-invalid")).toBeUndefined();
    expect(sponsor.attributes("aria-describedby")).toBeUndefined();
    save.element.focus();
    await save.trigger("click");
    await flushPromises();
    expect(startDate.element).toHaveFocus();
    expect(updateCampaign).not.toHaveBeenCalled();
    expect(name.element).toHaveValue("Campagne corrigée");
    expect(message.element).toHaveValue("Message à conserver");

    await startDate.setValue("2026-11-24");
    expect(startDate.attributes("aria-invalid")).toBeUndefined();
    expect(startDate.attributes("aria-describedby")).toBeUndefined();
    expect(startDate.element).toHaveAccessibleName(/Déclenche l'envoi automatique aux acteurs/);
    await save.trigger("click");
    await flushPromises();
    expect(updateCampaign).toHaveBeenCalledExactlyOnceWith({
      path: { id: campaign.id },
      body: {
        name: "Campagne corrigée",
        sponsorEmails: ["corrige@example.test"],
        message: "Message à conserver",
        startDate: new Date("2026-11-24"),
        endDate: null,
      },
    });
    expect(wrapper.find('[data-testid="admin-edit-quality-campaign-modal"]').exists()).toBe(false);
  });
});

it("conserve la garde des sponsors invalides lors de la réouverture d'une modale persistante", async () => {
  const wrapper = renderActions(true);
  await wrapper.setProps({ campaign: { ...campaign, sponsorEmails: ["email-invalide"] } });
  const open = wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]');
  await open.trigger("click");
  await wrapper.get('[data-testid="admin-quality-campaign-cancel-btn"]').trigger("click");
  await open.trigger("click");
  const save = wrapper.get<HTMLButtonElement>('[data-testid="admin-quality-campaign-save-btn"]');
  save.element.focus();
  await save.trigger("click");
  await flushPromises();
  expect(updateCampaign).not.toHaveBeenCalled();
  expect(wrapper.get('[data-testid="quality-campaign-sponsor-email-0"]').element).toHaveFocus();
});

describe("QualityCampaignActions — erreurs associées aux champs (#3322)", () => {
  it.each([
    { testid: "quality-campaign-name", invalid: "   ", valid: "Campagne corrigée", message: "Le nom de la campagne est requis." },
    { testid: "quality-campaign-start-date", invalid: "", valid: "2026-11-24", message: "La date de début est requise." },
  ])("associe l’erreur de $testid puis la retire après correction", async ({ testid, invalid, valid, message }) => {
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    expect(wrapper.text()).toContain("* = champs obligatoires");
    const input = wrapper.get<HTMLInputElement>(`input[data-testid="${testid}"]`);
    expect(input.element).not.toHaveAttribute("aria-invalid");
    await input.setValue(invalid);
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    expect(updateCampaign).not.toHaveBeenCalled();
    expect(input.element).toHaveValue(invalid);
    expect(input.element).toHaveAttribute("aria-invalid", "true");
    expect(input.element).toHaveAccessibleDescription(message);
    expect(document.getElementById(input.attributes("aria-describedby") ?? "")).toHaveTextContent(message);
    if (testid.endsWith("start-date")) expect(input.element).toHaveAccessibleName(expect.stringContaining("Déclenche l'envoi automatique"));
    await input.setValue(valid);
    expect(input.element).not.toHaveAttribute("aria-invalid");
    expect(input.element).not.toHaveAccessibleDescription(message);
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    await flushPromises();
    expect(updateCampaign).toHaveBeenCalledOnce();
  });

  it("conserve les erreurs locales des sponsors et permet de corriger sans nouvelle règle", async () => {
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    const email = wrapper.get<HTMLInputElement>('input[data-testid="quality-campaign-sponsor-email-0"]');
    await email.setValue("invalide");
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    expect(updateCampaign).not.toHaveBeenCalled();
    expect(email.element).toHaveValue("invalide");
    expect(email.element).toHaveAttribute("aria-invalid", "true");
    expect(email.element).toHaveAccessibleDescription("Email invalide. Format attendu – ex : exemple@mail.fr");
    await email.setValue(campaign.sponsorEmails[0]);
    expect(email.element).not.toHaveAttribute("aria-invalid");
    expect(wrapper.text()).not.toContain("Email invalide");
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    await flushPromises();
    expect(updateCampaign).toHaveBeenCalledOnce();
  });

  it("réinitialise la validation à la réouverture", async () => {
    const wrapper = renderActions();
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    await wrapper.get('[data-testid="quality-campaign-name"]').setValue("");
    await wrapper.get('[data-testid="admin-quality-campaign-save-btn"]').trigger("click");
    await wrapper.get('[data-testid="admin-quality-campaign-cancel-btn"]').trigger("click");
    await wrapper.get('[data-testid="admin-quality-campaign-edit-btn"]').trigger("click");
    expect(wrapper.get('input[data-testid="quality-campaign-name"]').element).not.toHaveAttribute("aria-invalid");
    expect(wrapper.get('input[data-testid="quality-campaign-name"]').element).toHaveValue(campaign.name);
  });
});

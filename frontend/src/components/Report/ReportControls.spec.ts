import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { ReportDto } from "@/client/types.gen";
import PrimeVue from "primevue/config";
import Notes from "./Notes.vue";
import ReportStatusTag from "./ReportStatusTag.vue";

const { updateReport, updateNotes, addErrorMessage } = vi.hoisted(() => ({
  updateReport: vi.fn(),
  updateNotes: vi.fn(),
  addErrorMessage: vi.fn(),
}));
vi.mock("@/stores/reportStore", () => ({ useReportStore: () => ({ updateReport, updateNotes }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage }) }));
enableAutoUnmount(afterEach);

const report: ReportDto = {
  id: "report-1",
  description: "Adresse à corriger",
  notes: "Prise en compte",
  status: "in_pending",
  createdAt: "2026-10-08T00:00:00.000Z",
  updatedAt: new Date("2026-10-08T00:00:00.000Z"),
  applicationId: null,
  application: null,
  notifierId: "notifier-1",
  notifier: { id: "notifier-1", email: "contact@example.fr" },
};

beforeEach(() => {
  vi.clearAllMocks();
  updateNotes.mockReset();
  updateReport.mockReset();
});

function renderNotes() {
  return mount(Notes, {
    attachTo: document.body,
    props: { notes: report.notes, reportId: report.id, reportDescription: report.description, isEditing: true },
    global: {
      plugins: [PrimeVue],
      stubs: {
        DsfrModal: {
          props: ["opened"],
          template:
            '<div v-if="opened" role="dialog"><button class="fr-btn--close" @click="$emit(\'close\')">Fermer</button><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
}

describe("Commandes de signalement", () => {
  it("nomme le select par le signalement et conserve la modification du statut", async () => {
    const wrapper = mount(ReportStatusTag, { props: { report, isEditing: true } });
    const select = wrapper.get("select");
    expect(select.element).toHaveAccessibleName("Statut du signalement : Adresse à corriger");
    await select.setValue("done");
    await flushPromises();
    expect(updateReport).toHaveBeenCalledWith("report-1", "", "done", true);
    expect(wrapper.emitted("refresh")).toHaveLength(1);
  });

  it("nomme l'édition et le champ de note par le signalement, sans perdre son contenu", async () => {
    const wrapper = mount(Notes, {
      props: { notes: report.notes, reportId: report.id, reportDescription: report.description, isEditing: true },
      global: {
        plugins: [PrimeVue],
        stubs: { DsfrModal: { props: ["opened"], template: '<div v-if="opened"><slot /><slot name="footer" /></div>' } },
      },
    });
    const edit = wrapper.get('[data-testid="actor-edit-notes"]');
    expect(edit.element).toHaveAccessibleName("Modifier la note du signalement : Adresse à corriger");
    await edit.trigger("click");
    const note = wrapper.get("textarea");
    expect(note.element).toHaveAccessibleName("Note du signalement : Adresse à corriger");
    expect(note.element).toHaveValue("Prise en compte");
    await note.setValue("Correction reçue");
    await wrapper.get('[data-testid="valid-dialog-button"]').trigger("click");
    await flushPromises();
    expect(updateNotes).toHaveBeenCalledWith("report-1", "Correction reçue");
    expect(wrapper.emitted("refresh")).toHaveLength(1);
  });

  it("rétablit le statut refusé sans rejouer la requête et suit les changements du parent sans appel", async () => {
    updateReport.mockRejectedValue(new Error("API refusée"));
    const wrapper = mount(ReportStatusTag, { props: { report, isEditing: true } });
    const select = wrapper.get("select");
    await select.setValue("done");
    await flushPromises();
    expect(updateReport).toHaveBeenCalledTimes(1);
    expect(select.element).toHaveValue("in_pending");
    expect(addErrorMessage).toHaveBeenCalledWith("Erreur lors de la mise à jour du statut du signalement.");
    await wrapper.setProps({ report: { ...report, status: "in_progress" } });
    await flushPromises();
    expect(select.element).toHaveValue("in_progress");
    expect(updateReport).toHaveBeenCalledTimes(1);
  });

  it("garde la note, son dialogue et le focus après un échec, en bloquant la double validation", async () => {
    let reject!: (reason: Error) => void;
    updateNotes.mockReturnValue(new Promise((_resolve, refuse) => (reject = refuse)));
    const wrapper = renderNotes();
    await wrapper.get('[data-testid="actor-edit-notes"]').trigger("click");
    const note = wrapper.get("textarea");
    await note.setValue("Note conservée");
    const submit = wrapper.get<HTMLButtonElement>('[data-testid="valid-dialog-button"]');
    submit.element.focus();
    const submission = submit.trigger("click");
    // jsdom garde le focus sur disabled ; reproduire le blur avant le rendu.
    submit.element.blur();
    await submission;
    await submit.trigger("click");
    await flushPromises();
    expect(updateNotes).toHaveBeenCalledTimes(1);
    expect(wrapper.get(".fr-btn--close").element).toHaveFocus();
    reject(new Error("Service indisponible"));
    await flushPromises();
    expect(wrapper.get('[data-testid="report-note-error"]').element).toHaveAttribute("role", "alert");
    expect(wrapper.get('[data-testid="report-note-error"]').text()).toContain("Erreur lors de l'enregistrement de la note");
    expect(note.element).toHaveValue("Note conservée");
    expect(submit.element).toHaveFocus();
    expect(wrapper.emitted("refresh")).toBeUndefined();
    expect(addErrorMessage).not.toHaveBeenCalled();
  });

  it("annonce l'échec différé après fermeture et ne reprend pas le focus", async () => {
    let reject!: (reason: Error) => void;
    updateNotes.mockReturnValue(new Promise((_resolve, refuse) => (reject = refuse)));
    const wrapper = renderNotes();
    await wrapper.get('[data-testid="actor-edit-notes"]').trigger("click");
    await wrapper.get("textarea").setValue("Note envoyée");
    await wrapper.get('[data-testid="valid-dialog-button"]').trigger("click");
    await wrapper.get(".fr-btn--close").trigger("click");
    expect(wrapper.find("textarea").exists()).toBe(false);
    const opener = wrapper.get<HTMLButtonElement>('[data-testid="actor-edit-notes"]');
    opener.element.focus();
    reject(new Error("Service indisponible"));
    await flushPromises();
    expect(addErrorMessage).toHaveBeenCalledWith("Erreur lors de l'enregistrement de la note.");
    expect(opener.element).toHaveFocus();
    expect(wrapper.emitted("refresh")).toBeUndefined();
  });
});

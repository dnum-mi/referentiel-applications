import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { ReportDto } from "@/client/types.gen";
import PrimeVue from "primevue/config";
import Notes from "./Notes.vue";
import ReportStatusTag from "./ReportStatusTag.vue";

const { updateReport, updateNotes } = vi.hoisted(() => ({ updateReport: vi.fn(), updateNotes: vi.fn() }));
vi.mock("@/stores/reportStore", () => ({ useReportStore: () => ({ updateReport, updateNotes }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn() }) }));
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

beforeEach(() => vi.clearAllMocks());

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
});

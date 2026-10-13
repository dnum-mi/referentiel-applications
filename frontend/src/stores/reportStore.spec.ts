import { createPinia, setActivePinia } from "pinia";
import { useReportStore } from "./reportStore";

const { updateGlobal, updateApplication } = vi.hoisted(() => ({ updateGlobal: vi.fn(), updateApplication: vi.fn() }));
vi.mock("@/api/index", () => ({
  default: { reportsControllerUpdate: updateGlobal, applicationReportsControllerUpdate: updateApplication },
}));

beforeEach(() => {
  setActivePinia(createPinia());
  updateGlobal.mockReset();
  updateApplication.mockReset();
});

describe("ReportStore — résultat HTTP du SDK", () => {
  it("rejette une mise à jour de note dont le SDK résout une réponse500", async () => {
    updateGlobal.mockResolvedValue({ response: { ok: false, status: 500 }, error: { message: "Service indisponible" } });
    await expect(useReportStore().updateNotes("report-1", "Note conservée")).rejects.toThrow("Erreur lors de l'enregistrement de la note");
    expect(updateGlobal).toHaveBeenCalledTimes(1);
  });

  it.each(["", "application-1"])("rejette le statut refusé, branche application=%s", async (applicationId) => {
    updateGlobal.mockResolvedValue({ response: { ok: false, status: 500 }, error: { message: "Service indisponible" } });
    updateApplication.mockResolvedValue({ response: { ok: false, status: 500 }, error: { message: "Service indisponible" } });
    await expect(useReportStore().updateReport("report-1", applicationId, "done", true)).rejects.toThrow("mise à jour du statut");
    expect(applicationId ? updateApplication : updateGlobal).toHaveBeenCalledTimes(1);
    expect(applicationId ? updateGlobal : updateApplication).not.toHaveBeenCalled();
  });

  it("accepte les vrais succès sans modifier les valeurs ni la notification demandée", async () => {
    updateGlobal.mockResolvedValue({ response: { ok: true, status: 200 }, data: { id: "report-1" } });
    updateApplication.mockResolvedValue({ response: { ok: true, status: 200 }, data: { id: "report-2" } });
    const store = useReportStore();
    await expect(store.updateNotes("report-1", "Note exacte", true)).resolves.toBe(true);
    expect(updateGlobal).toHaveBeenCalledWith({ path: { id: "report-1" }, body: { notes: "Note exacte" }, query: { notify: true } });
    await expect(store.updateReport("report-2", "application-1", "in_progress", false)).resolves.toBe(true);
    expect(updateApplication).toHaveBeenCalledWith({
      path: { applicationId: "application-1", id: "report-2" },
      body: { status: "in_progress" },
      query: { notify: false },
    });
  });
});

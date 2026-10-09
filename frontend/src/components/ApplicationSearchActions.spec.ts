import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { Permission } from "@/client";
import ApplicationSearchActions from "./ApplicationSearchActions.vue";

afterEach(() => cleanup());

const { addErrorMessage, addSuccessMessage, hasPermissions, syncWithGrist } = vi.hoisted(() => ({
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
  hasPermissions: vi.fn(),
  syncWithGrist: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage, addSuccessMessage }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions }) }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ syncWithGrist, downloadExcel: vi.fn() }),
}));
vi.mock("@/composables/use-application-search", async () => {
  const { ref } = await import("vue");
  return { useApplicationSearch: () => ({ filters: ref({}) }) };
});

function renderWith(permissions: Permission[]) {
  hasPermissions.mockImplementation((required: Permission[]) => required.every((p) => permissions.includes(p)));
  return render(ApplicationSearchActions, {
    global: { stubs: { ReportModal: true, CreateQualityCampaignModal: true, ColumnCustomization: true } },
  });
}

beforeEach(() => {
  addErrorMessage.mockReset();
  addSuccessMessage.mockReset();
  syncWithGrist.mockReset();
});

describe("ApplicationSearchActions — synchronisation Grist", () => {
  it("masque le bouton sans la capacité GristSync", () => {
    renderWith([Permission.DATA_EXPORT]);
    expect(screen.queryByTestId("grist-sync-btn")).toBeNull();
    expect(screen.queryByTestId("grist-sync-btn-mobile")).toBeNull();
  });

  it("lance la synchronisation et annonce le nombre d'applications écrites", async () => {
    syncWithGrist.mockResolvedValue({ tableCreated: false, rowsWritten: 42, rulesAdded: 0 });
    renderWith([Permission.GRIST_SYNC]);

    await fireEvent.click(screen.getByTestId("grist-sync-btn"));

    await waitFor(() => expect(addSuccessMessage).toHaveBeenCalledWith("42 applications synchronisées avec Grist."));
    expect(syncWithGrist).toHaveBeenCalledTimes(1);
  });

  it("signale un échec sans planter", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    syncWithGrist.mockRejectedValue(new Error("502"));
    renderWith([Permission.GRIST_SYNC]);

    await fireEvent.click(screen.getByTestId("grist-sync-btn"));

    await waitFor(() => expect(addErrorMessage).toHaveBeenCalled());
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });
});

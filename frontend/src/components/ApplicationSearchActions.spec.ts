import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { Permission } from "@/client";
import ApplicationSearchActions from "./ApplicationSearchActions.vue";

afterEach(() => cleanup());

const { hasPermissions, user, downloadExcel, downloadHtml, addErrorMessage } = vi.hoisted(() => ({
  user: { gristDocIds: ["doc1"] as string[], gristUrl: "https://grist.example" as string | null, hasGristApiKey: true },
  hasPermissions: vi.fn(),
  downloadExcel: vi.fn(),
  downloadHtml: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions, user }) }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ downloadExcel, downloadHtml }),
}));
vi.mock("@/composables/use-application-search", async () => {
  const { ref } = await import("vue");
  return { useApplicationSearch: () => ({ filters: ref({ shortName: "app" }) }) };
});

function renderWith(permissions: Permission[]) {
  hasPermissions.mockImplementation((required: Permission[]) => required.every((p) => permissions.includes(p)));
  return render(ApplicationSearchActions, {
    global: {
      stubs: {
        ReportModal: true,
        CreateQualityCampaignModal: true,
        ColumnCustomization: true,
        GristSyncModal: {
          props: ["opened"],
          emits: ["close"],
          template:
            '<div data-testid="grist-sync-modal" :opened="String(opened)"><button v-if="opened" @click="$emit(\'close\')">Annuler la synchronisation</button></div>',
        },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(user, { gristDocIds: ["doc1"], gristUrl: "https://grist.example", hasGristApiKey: true });
});

describe("ApplicationSearchActions — synchronisation Grist", () => {
  it("masque le bouton sans la capacité GristSync", () => {
    renderWith([Permission.DATA_EXPORT]);
    expect(screen.queryByTestId("grist-sync-btn")).toBeNull();
    expect(screen.queryByTestId("grist-sync-btn-mobile")).toBeNull();
  });

  it.each([
    ["sans document", { gristDocIds: [] }],
    ["sans URL", { gristUrl: null }],
    ["sans clé d'API", { hasGristApiKey: false }],
  ])("désactive le bouton tant que le profil est %s", (_, missing) => {
    Object.assign(user, missing);
    renderWith([Permission.GRIST_SYNC]);

    const button = screen.getByTestId("grist-sync-btn");
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleName(/^Synchroniser avec Grist/);
    expect(screen.getByTestId("grist-sync-btn-mobile")).toHaveAccessibleName(/^Synchroniser avec Grist/);
    expect(button).toHaveAttribute(
      "title",
      "Renseignez votre connexion et vos documents Grist dans l'onglet « Synchronisation Grist » de votre profil pour synchroniser",
    );
  });

  it("ouvre la modale de synchronisation", async () => {
    renderWith([Permission.GRIST_SYNC]);
    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "false");

    await fireEvent.click(screen.getByTestId("grist-sync-btn"));

    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "true");
  });

  it.each(["grist-sync-btn", "grist-sync-btn-mobile"])("rend le focus au bouton %s après annulation", async (testId) => {
    renderWith([Permission.GRIST_SYNC]);
    const button = screen.getByTestId(testId);
    button.focus();
    await fireEvent.click(button);
    const cancel = screen.getByRole("button", { name: "Annuler la synchronisation" });
    cancel.focus();
    await fireEvent.click(cancel);
    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "false");
    expect(button).toHaveFocus();
  });

  it("conserve l'export HTML à côté de la synchronisation et empêche un export concurrent", async () => {
    let finishExport: (() => void) | undefined;
    downloadHtml.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishExport = resolve;
      }),
    );
    renderWith([Permission.DATA_EXPORT, Permission.GRIST_SYNC]);
    const htmlButton = screen.getByTestId("applications-export-html-btn");
    const excelButton = screen.getByTestId("application-export-btn");
    expect(screen.getByTestId("grist-sync-btn")).toBeEnabled();
    await fireEvent.click(htmlButton);
    expect(downloadHtml).toHaveBeenCalledExactlyOnceWith({ shortName: "app" });
    expect(screen.getAllByRole("status").some((status) => status.textContent?.includes("Préparation de l’export HTML…"))).toBe(true);
    await fireEvent.click(excelButton);
    expect(downloadExcel).not.toHaveBeenCalled();
    finishExport?.();
    await vi.waitFor(() => expect(htmlButton).toBeEnabled());
    await fireEvent.click(excelButton);
    expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ shortName: "app" });
  });

  it("conserve l'erreur et le réessai de l'export HTML", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    downloadHtml.mockRejectedValueOnce(new Error("Échec simulé"));
    renderWith([Permission.DATA_EXPORT]);
    const button = screen.getByTestId("applications-export-html-btn");
    await fireEvent.click(button);
    await vi.waitFor(() =>
      expect(addErrorMessage).toHaveBeenCalledExactlyOnceWith("Une erreur est survenue lors de l'exportation HTML. Veuillez réessayer."),
    );
    expect(button).toBeEnabled();
    await fireEvent.click(button);
    expect(downloadHtml).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });
});

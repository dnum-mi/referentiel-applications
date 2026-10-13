import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { Permission } from "@/client";
import ApplicationSearchActions from "./ApplicationSearchActions.vue";

afterEach(() => cleanup());

const { hasPermissions, user } = vi.hoisted(() => ({
  user: { gristDocIds: ["doc1"] as string[], gristUrl: "https://grist.example" as string | null, hasGristApiKey: true },
  hasPermissions: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: vi.fn() }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions, user }) }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ downloadExcel: vi.fn() }),
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
        GristSyncModal: { props: ["opened"], template: '<div data-testid="grist-sync-modal" :opened="String(opened)" />' },
      },
    },
  });
}

beforeEach(() => {
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
});
